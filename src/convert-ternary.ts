import * as ts from "typescript";
import * as vscode from "vscode";
import * as parser from "./parser";

/**
 * Takes in a potentially deeply-nested ConditionalExpression and converts it into a logically equal IfStatement.
 * i.e. Given:
 * a ? b ? b1 : b2 : c;
 *
 * This function will generate:
 * if (a) {
 *   if (b) {
 *     return b1;
 *   } else {
 *     return b2;
 *   }
 * } else {
 *   return c;
 * }
 *
 * Which can be later refactored further.
 *
 * @param expression A given expression, usually a ConditionalExpression.
 * @returns A logically identical version of the ConditionalExpression as an IfStatement.
 */
const recurseConditionalIntoIfElse = (
    expression: ts.Expression
): ts.IfStatement | ts.ReturnStatement => {
    // If we are not a conditional expression, we probably live in one. Just return the expression as normal.
    if (!ts.isConditionalExpression(expression)) {
        return ts.factory.createReturnStatement(expression);
    }

    // If we are a conditional expression, we need to return an if/else statement of the conditional.
    return ts.factory.createIfStatement(
        expression.condition,
        ts.factory.createBlock([
            recurseConditionalIntoIfElse(expression.whenTrue),
        ]),
        ts.factory.createBlock([
            recurseConditionalIntoIfElse(expression.whenFalse),
        ])
    );
};

export class TernaryConverter implements vscode.CodeActionProvider {
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

        const old = parser.getContainingStatement<ts.ConditionalExpression>(
            node,
            ts.isConditionalExpression
        );

        if (old === undefined) {
            return;
        }

        const newStatement = recurseConditionalIntoIfElse(old);
        const fix = new vscode.CodeAction(
            "Convert ternary into if/else",
            vscode.CodeActionKind.QuickFix
        );

        fix.edit = new vscode.WorkspaceEdit();
        fix.edit.replace(
            document.uri,
            parser.getVscodeRangeOfNode(old, source),
            parser.printNode(newStatement, source)
        );

        return [fix];
    }
}
