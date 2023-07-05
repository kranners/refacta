import * as fs from "fs";
import * as ts from "typescript";
import * as vscode from "vscode";
import * as parser from "./parser";

export function activate(context: vscode.ExtensionContext) {
    const generateAst = vscode.commands.registerCommand(
        "refacta.generateAst",
        () => {
            const context = parser.getActiveDocumentContext();

            if (context === undefined) {
                return;
            }

            const ast = parser.astAtNode(context.source, context.source);

            fs.writeFileSync(
                `${context.source.fileName}.ast.json`,
                JSON.stringify(ast, null, 2)
            );
        }
    );

    const isThisAnIfElse = vscode.commands.registerCommand(
        "refacta.isIfElse",
        () => {
            const node = parser.getActiveNode();

            if (node === undefined) {
                return;
            }

            const containingIf = parser.getContainingIfStatement(node);

            if (containingIf === undefined) {
                return;
            }

            if (parser.isIfElseStatement(containingIf)) {
                return vscode.window.showInformationMessage("yes");
            }

            return vscode.window.showInformationMessage("no");
        }
    );

    const getAstFromCursor = vscode.commands.registerCommand(
        "refacta.astAtCursor",
        () => {
            const node = parser.getActiveNode();

            if (node === undefined) {
                return;
            }

            // Get the node's syntax kind and text
            const kind = ts.SyntaxKind[node.kind];
            const text = node.getFullText();

            return vscode.window.showInformationMessage(
                JSON.stringify({
                    kind,
                    text,
                    pos: node.pos,
                })
            );
        }
    );

    context.subscriptions.push(generateAst);
    context.subscriptions.push(isThisAnIfElse);
    context.subscriptions.push(getAstFromCursor);
}

export function deactivate() {}
