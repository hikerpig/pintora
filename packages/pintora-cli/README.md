# `@pintora/cli`


@pintora/cli is a simple multi-command command-line Node.js application that transform the pintora DSL into diagram images.

You can install it globally with:

```sh
npm i -g @pintora/cli
```

Get some help with `pintora --help`:

## Usage

Pelease refer to the online [documentation and demo](http://pintorajs.vercel.app/docs/intro/) for more details.

```sh
pintora [command]

Commands:
  pintora render  Render DSL to diagram image

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]
```

### pintora render

```sh
pintora render

Render DSL to diagram image

Options:
      --version           Show version number                          [boolean]
      --help              Show help                                    [boolean]
  -i, --input             Input file path                             [required]
  -o, --output            Output file path
  -p, --pixel-ratio       Pixel ratio                               [default: 2]
  -b, --background-color  Background color
  -t, --theme             Pintora theme                     [default: "default"]
  -w, --width             Canvas width
```

examples:

```sh
pintora render -i ../test-shared/example-files/sequence.pintora -o sequence.png

# Set image background color
pintora render -i ../test-shared/example-files/sequence-2.pintora -b "#FAFAFA" -o sequence-2.jpg

# Preview with theme 'dark'
pintora render -i ../test-shared/example-files/sequence-2.pintora --theme dark -o sequence-2.jpg

# Set canvas width to 1000, and set `core.useMaxWidth` to true by default
pintora render -i ../test-shared/example-files/sequence.pintora --width 1000 -o sequence-w-1000.jpg
```
