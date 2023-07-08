import * as ts from "typescript";
import * as vscode from "vscode";
import * as parser from "./parser";

/**
 * Takes in an expression, and applies the ! exclamation token to it.
 * If the expression already has a ! token, it will return the expression without it.
 *
 * @param expression A logical expression to invert
 * @returns An NOT'd equivalent of that expression
 */
const invertExpression = (expression: ts.Expression): ts.Expression => {
    // If this is a !expression, then just remove the exclamation token.
    if (
        ts.isPrefixUnaryExpression(expression) &&
        expression.operator === ts.SyntaxKind.ExclamationToken
    ) {
        return expression.operand;
    }

    // Otherwise, return !expression.
    return ts.factory.createPrefixUnaryExpression(
        ts.SyntaxKind.ExclamationToken,
        expression
    );
};

/**
 * Takes in a block (like one from a IfStatement.thenStatement) and returns a list of
 * its containing Statements. Will also optionally add in an empty return at the end.
 *
 * @param block A given block to grab the statements of
 * @param addMissingReturn Whether to add a missing return or not
 * @returns
 */
const getBlockStatements = (
    block: ts.Block,
    addMissingReturn?: boolean
): ts.Statement[] => {
    // If we are lacking a return statement, and wish to add one, then add one in and return.
    if (addMissingReturn && !block.statements.some(ts.isReturnStatement)) {
        return [...block.statements, ts.factory.createReturnStatement()];
    }

    return [...block.statements];
};

export class IfFlipper implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix,
    ];

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection
    ): vscode.ProviderResult<vscode.CodeAction[]> {
        const { source, node } = parser.getActiveActionContext(document, range);

        // If we're hovering over nothing, do nothing.
        if (node === undefined) {
            return;
        }

        const containingIf = parser.getContainingStatement<ts.IfStatement>(
            node,
            ts.isIfStatement
        );

        // If we have no containing if statement, or it is not an if/else statement, do nothing.
        if (
            containingIf === undefined ||
            containingIf.elseStatement === undefined
        ) {
            return;
        }

        const simplify = this.createSimplifyAction(
            containingIf,
            document,
            source
        );

        const invertAndSimplify = this.createInvertAndSimplifyAction(
            containingIf,
            document,
            source
        );

        return [simplify, invertAndSimplify];
    }

    private createSimplifyAction = (
        ifStatement: ts.IfStatement,
        document: vscode.TextDocument,
        source: ts.SourceFile
    ): vscode.CodeAction => {
        const thenContents = getBlockStatements(
            ifStatement.thenStatement as ts.Block,
            true
        );
        const elseContents = getBlockStatements(
            ifStatement.elseStatement as ts.Block
        );

        const newIfStatement = ts.factory.createIfStatement(
            ifStatement.expression,
            ts.factory.createBlock(thenContents)
        );

        const fix = new vscode.CodeAction(
            "Simplify if/else",
            vscode.CodeActionKind.QuickFix
        );
        fix.edit = new vscode.WorkspaceEdit();
        fix.edit.replace(
            document.uri,
            parser.getVscodeRangeOfNode(ifStatement, source),
            parser.getNodeArrayFullText(
                [newIfStatement, ...elseContents],
                source
            )
        );

        return fix;
    };

    private createInvertAndSimplifyAction = (
        ifStatement: ts.IfStatement,
        document: vscode.TextDocument,
        source: ts.SourceFile
    ): vscode.CodeAction => {
        const thenContents = getBlockStatements(
            ifStatement.thenStatement as ts.Block
        );
        const elseContents = getBlockStatements(
            ifStatement.elseStatement as ts.Block,
            true
        );

        const newIfStatement = ts.factory.createIfStatement(
            invertExpression(ifStatement.expression),
            ts.factory.createBlock(elseContents)
        );

        const fix = new vscode.CodeAction(
            "Invert and simplify if/else",
            vscode.CodeActionKind.QuickFix
        );
        fix.edit = new vscode.WorkspaceEdit();
        fix.edit.replace(
            document.uri,
            parser.getVscodeRangeOfNode(ifStatement, source),
            parser.getNodeArrayFullText(
                [newIfStatement, ...thenContents],
                source
            )
        );

        return fix;
    };
}
