import * as ts from "typescript";
import * as vscode from "vscode";

const printer = ts.createPrinter();

export type DocumentContext = {
    document: vscode.TextDocument;
    cursor: vscode.Position;
    source: ts.SourceFile;
};

export type ActionContext = {
    source: ts.SourceFile;
    cursor: number;
    node?: ts.Node;
};

export const getActiveActionContext = (
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection
): ActionContext => {
    const source = ts.createSourceFile(
        document.fileName,
        document.getText(),
        ts.ScriptTarget.Latest,
        true
    );

    const cursor = getSourcePositionFromVscode(range.start, source);
    const node = getAstNodeAtPosition(source, cursor);

    return { source, cursor, node };
};

/**
 * Converts a VSCode position into a TS source position.
 *
 * @param cursor A VSCode position for a given document.
 * @param source A TS SourceFile which the position belongs to.
 * @returns
 */
export const getSourcePositionFromVscode = (
    cursor: vscode.Position,
    source: ts.SourceFile
) => {
    return source.getPositionOfLineAndCharacter(cursor.line, cursor.character);
};

export const getActiveDocumentContext = (): DocumentContext | undefined => {
    // Load the current document from the VSCode API
    const document = vscode.window.activeTextEditor?.document;
    const cursor = vscode.window.activeTextEditor?.selection.active;

    // If there is nothing open, just return.
    if (document === undefined || cursor === undefined) {
        return;
    }

    // Create a new TypeScript API source file
    const source = ts.createSourceFile(
        document.fileName,
        document.getText(),
        ts.ScriptTarget.Latest,
        true
    );

    return { document, cursor, source };
};

/**
 * Traverses the AST to do a depth-first search for the most deeply nested node at a given position.
 *
 * @param node A given node, generally will be a SourceFile
 * @param pos A zero-based position, not line number or character number.
 * @returns The most nested (most specific) node that falls in that range.
 */
export const getAstNodeAtPosition = (
    node: ts.Node,
    pos: number
): ts.Node | undefined => {
    // Iterate while we're still iterating over nodes.
    while (node.kind >= ts.SyntaxKind.FirstNode) {
        // Get all the children that fall within the range of our given position.
        const validChildren = ts.forEachChild(node, (child) => {
            // If the child contains the position, it's valid.
            if (child.pos <= pos && child.end > pos) {
                return child;
            }

            // Otherwise, it's invalid.
            return undefined;
        });

        // If we have no valid children, break here, this is the deepest node!
        if (validChildren === undefined) {
            return node;
        }

        node = validChildren;
    }

    return node;
};

/**
 * Grabs the TS node which the cursor is currently placed over in the VSCode active text editor.
 *
 * @returns The active TS node being hovered by the user.
 */
export const getActiveNode = (): ts.Node | undefined => {
    const context = getActiveDocumentContext();

    if (context === undefined) {
        return;
    }

    const { cursor, source } = context;
    const position = getSourcePositionFromVscode(cursor, source);

    return getAstNodeAtPosition(source, position);
};

/**
 * Takes in a node that may be a child of a T (say, an IfStatement).
 * Will either return that containing T statement, or undefined if it does not exist.
 *
 * @param node A node that is possibly contained in a T.
 * @param isValid A valid type guard (usually provided by TypeScript) to check if a ts.Node is a T.
 * @returns
 */
export const getContainingStatement = <T extends ts.Node>(
    node: ts.Node,
    isValid: (node: any) => node is T
): T | undefined => {
    while (!isValid(node)) {
        if (ts.isSourceFile(node.parent)) {
            return undefined;
        }

        node = node.parent;
    }

    return node;
};

export type ExtractedStatements = {
    thenStatements: ts.Statement[];
    elseStatements: ts.Statement[];
};

export const printNode = (given: ts.Node, source: ts.SourceFile) =>
    printer.printNode(ts.EmitHint.Unspecified, given, source);

export const getNodeArrayFullText = (
    given: ts.Node[],
    source: ts.SourceFile
): string => {
    return given.map((node) => printNode(node, source)).join("\n");
};

export const getVscodeRangeOfNode = (
    node: ts.Node,
    source: ts.SourceFile
): vscode.Range => {
    const start = ts.getLineAndCharacterOfPosition(source, node.pos);
    const end = ts.getLineAndCharacterOfPosition(source, node.end);

    return new vscode.Range(
        new vscode.Position(start.line, start.character),
        new vscode.Position(end.line, end.character)
    );
};
