import * as vscode from "vscode";

export class IfFlipper implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix,
    ];

    provideCodeActions(): // document: vscode.TextDocument,
    // range: vscode.Range | vscode.Selection,
    // context: vscode.CodeActionContext,
    // token: vscode.CancellationToken
    vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
        throw new Error("not implemented");
        const getSymbols = new vscode.CodeAction(
            "get symbols",
            vscode.CodeActionKind.QuickFix
        );
    }
};