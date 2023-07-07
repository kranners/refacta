import * as ts from "typescript";
import * as vscode from "vscode";
import * as parser from "./parser";

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
        const thenContents = parser.getBlockStatements(
            ifStatement.thenStatement as ts.Block,
            true
        );
        const elseContents = parser.getBlockStatements(
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
        const thenContents = parser.getBlockStatements(
            ifStatement.thenStatement as ts.Block
        );
        const elseContents = parser.getBlockStatements(
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
