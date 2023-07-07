import * as vscode from "vscode";
import { TernaryConverter } from "./convert-ternary";
import { IfFlipper } from "./flip-if";

export function activate(context: vscode.ExtensionContext) {
    const flipProvider = vscode.languages.registerCodeActionsProvider(
        "typescript",
        new IfFlipper(),
        {
            providedCodeActionKinds: IfFlipper.providedCodeActionKinds,
        }
    );

    const ternaryProvider = vscode.languages.registerCodeActionsProvider(
        "typescript",
        new TernaryConverter(),
        {
            providedCodeActionKinds: TernaryConverter.providedCodeActionKinds,
        }
    );

    context.subscriptions.push(flipProvider);
    context.subscriptions.push(ternaryProvider);
}

export function deactivate() {}
