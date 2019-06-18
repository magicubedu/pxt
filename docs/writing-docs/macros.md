# Macros

MakeCode has several custom macros that extend regular markdown. These provide extra style features and code / blocks rendering in the document pages.

The following macros are the MakeCode custom extensions to markdown.

## Checkboxes in bullet points

Use ``* [ ]`` to create a bullet point with a square and ``* [x]`` for a checked bullet point

### Checked bullets

* [ ] unchecked bullet point
* [x] checked bullet point

```
* [ ] unchecked bullet point
* [x] checked bullet point
```

### Regular bullets

* a regular bullet point

```
* a regular bullet point
```

## avatar

MakeCode targets have avatar icons that help express a more personalized message to a user. The avatar icon is specified by its ``class`` name.

### ~avatar avatar

Hi! Writing docs for MakeCode is great!

### ~

```
### ~avatar [class]

[content]

### ~
```

**Example:** the [blink lesson](https://makecode.microbit.org/lessons/blink/activity)
and it's [markdown](https://github.com/Microsoft/pxt-microbit/blob/master/docs/lessons/blink/activity.md) source.

## Message Boxes

Message boxes bring special attention to an idea or to something that the user must take note of. There are several types of message boxes.

### hint

### ~hint

#### Hint Title
[content]

### ~

```
### ~hint

#### Hint Title
[content]

### ~
```

### reminder

### ~reminder

#### Reminder Title
[content]

### ~

```
### ~reminder

#### Reminder Title
[content]

### ~
```
### alert

### ~alert

#### Alert Title
[content]

### ~
```
### ~alert

#### Alert Title
[content]

### ~
```

### tip

### ~tip

#### Tip Title 
[content]

### ~
```
### ~tip

#### Tip Title 
[content]

### ~
```

## Buttons

As a navigation aid, the button macro is used to move to another page within the target's document tree.

### ~button /writing-docs/tutorials

NEXT: Tutorials

### ~

```
## ~button /writing-docs/tutorials

NEXT: Tutorials

## ~
```

## Inline button rendering

Use inline buttons to render a button like element. These aren't linked to any action, they just display like buttons.

``|primary button|``

``||secondary button||``

```
``|primary button|``

``||secondary button||``
```

### Namespace coloring

When a namespace specifier is included in the button text, the button will have the same color that is defined for showing blocks from that namespace. Use the namespace name separated with a ``:``.

```
``||loops:forever||``
```

## Inline code snippets

If an inline code snippet start with `[` and ends with `]`, the doc engine will try to render it as a block. It must contain a valid API call
to the desired block.

Set your text variable like this: ``[let txt = "text"]``

```
Set your text variable like this: ``[let txt = "text"]``
```

To change the inline code snippet color to reflect the namespace color, use this format:


```
``[namespace.blockname]``
```

## Code snippets

To avoid changing screenshots, PXT automatically renders code snippets to blocks or javascript. This is done by specifying a pseudo-language on a code section.

### dependencies

You need declare the packages required to load your snippet, unless they are part of the default empty template.
Simple provide a list of package name using the ``package`` macro.

    ```package
    microbit-devices
    microbit-bluetooth
    ```

### features

You can specify required "features" for a given documentation page. In the case of a multi-board editor,
MakeCode will match the feature set with existing boards.

    ```config
    feature=pinsled
    feature=pinsd1
    ```

### blocks

The **blocks** "language" renders a JavaScript snippet into blocks and provides a simulator if needed.

    ```blocks
    basic.showNumber(5)
    ```

**Example:** the [forever](https://makecode.microbit.org/reference/basic/forever) reference doc
and it's [markdown](https://github.com/Microsoft/pxt-microbit/blob/master/docs/reference/basic/forever.md) source.

### project

The **project** "language" is similar to blocks but renders a published project.

    ```project
    twejlyucio
    ```

### sig

The **sig** "language" displays a signature of the first function call in the snippet.

    ```sig
    basic.showNumber(5)
    ```

**Example:** the [forever](https://makecode.microbit.org/reference/basic/forever) reference doc
and it's [markdown](https://github.com/Microsoft/pxt-microbit/blob/master/docs/reference/basic/forever.md) source.

### cards

The **cards** "language" displays a code card for each function call.

    ```cards
    basic.showNumber(0);
    basic.showLeds(`
    . . . . .
    . . . . .
    . . # . .
    . . . . .
    . . . . .
    `);
    basic.showString("Hello!");
    basic.clearScreen();
    ```

**Example:** the [basic](https://makecode.micorbit.org/reference/basic) reference doc
and it's [markdown](https://github.com/Microsoft/pxt-microbit/blob/master/docs/reference/basic.md) source.

### namespaces

The **namespaces** "language" displays a code card for the first symbol of each namespace.

    ```namespaces
    basic.showNumber(0);
    input.onButtonPressed(() => {});
    ```

**Example:** the [reference](https://makecode.microbit.org/reference) namespaces doc
and it's [markdown](https://github.com/Microsoft/pxt-microbit/blob/master/docs/reference.md) source.

### block

The **block** "language" renders a JavaScript snippet into blocks without any simulator.

    ```block
    basic.showNumber(5)
    ```

### javascript

If you need a rendering of typescript, javascript code, specify the language as ``typescript``.

    ```typescript
    let x = 0;
    ```

### spy

If your editor supports [Static Python](/js/python), you can specify a TypeScript snippet to be rendered as Static Python
using the ``spy`` macro.

    ```spy
    let x = 0;
    ```

### ghost

The **ghost** "language" causes addtional blocks to appear in the Toolbox during a tutorial step. This is used to provide additional block choices other than those matching the code snippet in a **blocks** section. The **ghost** blocks don't render but serve to identify other blocks to add to the Toolbox choices.

    ```ghost
    let x = 0;
    ```

### codecard

To render one or more code cards as JSON into cards, use **codecard**.

    ```codecard
    [{
        "title": "A card",
        "url": "...."
    }, {
        "title": "Another card",
        "url": "...."
    }]
    ```

### ignore #ignore

Append `-ignore` to any of the above to ignore a snippet in automated testing:

    ```typescript-ignore
    // You can include illegal TS in here, e.g. to showcase concepts/psuedocode 
    for (initialization; check; update) {
        ...
    }
    ```

### invalid

You can use `typescript-invalid` to showcase typescript that is **incorrect**:

    ```typescript-invalid
    // You can include illegal TS in here, e.g. to document syntax errors
    callFunction(;
    ```

### valid

You can use `typescript-valid` to showcase typescript that is **correct**:

    ```typescript-valid
    // You can include any TS in here, e.g. to showcase correct syntax
    callFunction();
    ```
