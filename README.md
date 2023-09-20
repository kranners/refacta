# refacta

Provides refactoring tools for legacy TypeScript codebases.

### Installation

This extension is not published on the VSCode marketplace, but you can install it from source pretty easily:

_This uses `bun`, but you could just as easily use `npm` or `yarn`._
```shell
# Install the requirements
bun install

# Build from source
bun package

# Install the extension into VSCode
code --install-extension refacta-0.0.1.vsix
```


### Features

**Simplify if/else**
Replaces an if/else with an equivalent one, replacing the else statement with an early return.
For example, converts:
```ts
if (!isAdmin) {
    return <UserPage />;
}
else {
    return <AdminPage />
}
```

Into

```ts
if (!isAdmin) {
  return <UserPage/>;
}

return <AdminPage/>;
```

If there is no `return` statement in the initial then clause, one will be added.

**Invert and simplify if/else**
Replaces an if/else with an inverted one, and early returns from the else clause.
For example, converts:

```ts
if (isAdmin) {
    doSomeAdminStuff();
    ...
    happyPath();
} else {
    youAreNotAllowed();
}
```

Into

```ts
if (!isAdmin) {
    return youAreNotAllowed();
}

doSomeAdminStuff();
...
happyPath();
```

**Convert ternary expression to if/else**

Converts a ternary expression of any nesting level into an if/else tree.
For example, converts:
```ts
!sessionStartDateTime.isSame(sessionEndDateTime, 'day')
  ? !sessionStartDateTime.isSame(sessionEndDateTime, 'month')
    ? !sessionStartDateTime.isSame(sessionEndDateTime, 'year')
      ? sessionStartDateTime.format("ddd D MMM 'YY") + ' - ' + sessionEndDateTime.format("ddd D MMM 'YY")
      : sessionStartDateTime.format('ddd D MMM') + ' - ' + sessionEndDateTime.format("ddd D MMM 'YY")
    : sessionStartDateTime.format('ddd D') + ' - ' + sessionEndDateTime.format("ddd D MMM 'YY")
  : sessionStartDateTime.format("ddd D MMM 'YY");
```

Into

```ts
if (!sessionStartDateTime.isSame(sessionEndDateTime, 'day')) {
    if (!sessionStartDateTime.isSame(sessionEndDateTime, 'month')) {
        if (!sessionStartDateTime.isSame(sessionEndDateTime, 'year')) {
            return sessionStartDateTime.format("ddd D MMM 'YY") + ' - ' + sessionEndDateTime.format("ddd D MMM 'YY");
        }
        else {
            return sessionStartDateTime.format('ddd D MMM') + ' - ' + sessionEndDateTime.format("ddd D MMM 'YY");
        }
    }
    else {
        return sessionStartDateTime.format('ddd D') + ' - ' + sessionEndDateTime.format("ddd D MMM 'YY");
    }
}
else {
    return sessionStartDateTime.format("ddd D MMM 'YY");
};
```
