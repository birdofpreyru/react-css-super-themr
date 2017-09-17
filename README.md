[![npm version](https://img.shields.io/npm/v/react-css-super-themr.svg?style=flat-square)](https://www.npmjs.com/package/react-css-super-themr)
[![NPM Status](http://img.shields.io/npm/dm/react-css-super-themr.svg?style=flat-square)](https://www.npmjs.com/package/react-css-super-themr)

# React CSS Super Themr
This package is a customized version of [`react-css-themr`](https://github.com/javivelasco/react-css-themr). Original package implements a cool concept for adhoc and context theming of re-usable ReactJS components; unfortunately, in practice it does not shine when you cannot guarantee a constant order of classes in your CSS bundle(s). React CSS Super Themr solves this.

### Differences from React CSS Themr
If you are already familiary with `react-css-themr`, here are the differences in this package:
-   Default theme priority is: ad-hoc (highest), context, default (lowest);
-   Possible to change priority of context and default theme, both for a component as a whole, and for its particular instanse;
-   Possible to idependently change composition (merge) method for context-default theme pair, and for the result of this merge and ad-hoc theme; bot for a component as a whole, and for its particular instances;
-   By default (and with default priority), context theme is softly merged into default one; then ad-hoc theme is deeply merged into the result of the first merge.

### Concept
It is assumed through this document that you use in your app [ReactJS](https://facebook.github.io/react/) with [Babel](https://babeljs.io/), [CSS Modules](https://github.com/gajus/babel-plugin-react-css-modules), and [SCSS](http://sass-lang.com/documentation/file.SCSS_FOR_SASS_USERS.html); sure [Webpack](https://webpack.js.org/) is assumed to be your bundler.

React CSS Super Themr helps to  create reusable ReactJS components that can be easily styled for use in different locations. The key ideas are:
-  **Default style theme** is assinged to the component upon component definition;
-  **Ad-hoc style theme** can be applied to the component instances, to customize some (possibly all) styling aspects of the default theme;
-  **Context style theme** is a way to customize default theme of all instances of a specific component within some segment of the application.

Technically, any theme is a SCSS stylesheet. When imported into JS code as `import theme from './theme.scss';`, the stylesheet itself is compiled and bundled into CSS bundle(s), while `theme` in JS turns into an object with original class names from SCSS as keys, and the corresponding class names in the generated CSS as values.

Multiple themes (default, context, ad-hoc), applied to the same instance of a component, have to be merged together. Here are three ways to merge a pair of themes:
-  **Swap (X, Y)** - theme **Y** completely replaces theme **X** - only SCSS classes from **Y** will be applied to the component instance;
-  **Soft (X, Y)** - all SCSS classes from theme **Y** will be applied to the component instance, overriding matching classes from theme **X**, however any classes present only in theme **X** will be also applied;
-  **Deep (X, Y)** - all SCSS classes from themes **X** and **Y** will be applied to the component instance. It means that for any style rule present for the same class both in theme **X** and **Y**, the final value will depend on the final order of theme styles in your CSS bundle. This is ***DANGEROUS*** because chances are that you cannot control the order of code corresponding to different SCSS modules in the final CSS bundle(s); and it is hard to guarantee that the order will stay constant during the lifetime of your application. Because of this, deep theme merging is allowed only for the ad-hoc theming, where you can use `!important` statements in SCSS to ensure that ad-hoc style rules have higher priority, independent of code order in the CSS bundle. As any ad-hoc theme, by design, has the highest priority, and related code is never reused, using `!important` statement in this case does not cause any side-effects.

**Theme priority:** by default, context theme has priority over the default theme of a component instance. It is possible to configure a component, or its specific instance, so that the default theme has priority over the context one. Ad-hoc theme always has the highest priority!

By default (i) the context theme is softly merged into the default theme of the component; then (ii) the ad-hoc theme is deeply merged into the result. Any missing theme is treated an empty theme with no classes; deep and soft merge of an empty theme into another theme does not change the later, while swap merge of an empty theme into another theme results in the empty theme as the result. When priority of context and default themes is switched, then default theme is merged into the context on in the step (i). It is possible to change the merge type in the step (i) for swap-merge; and it is possible to independently change the merge type in the step (ii) for soft-, or swap-merge.

### Example
Install this package with
```sh
$ npm install --save react-css-super-themr
```

Say, we want to make the following ReactJS component themable (blue text inside green box):
```js
// style.scss

.box {
  background: green;
}

.text {
  color: blue;
}

// Component.jsx

import React from 'react';
import './style.scss';

export default function Component() {
  return (
    <div styleName="box">
      <div styleName="text">Sample Component</div>
    </div>
  );
}

// Demo.jsx

import React from 'react';
import Component from './Component';

export default function Demo() {
  return (
    <div>
      <Component />
      <Component />
      <Component />
    </div>
  );
}
```

We do the following simple update of `Component.jsx`:
```js
// Component.jsx

import PT from 'prop-types';
import React from 'react';
import { themr } from 'react-css-super-themr';
import style from './style.scss';

function Component({ theme }) {
  return (
    <div className={theme.box}>
      <div className={theme.text}>Sample Component</div>
    </div>
  );
}

Component.propTypes = {
  theme: PT.shape({
    box: PT.string,
    text: PT.string,
  }).isRequired,
};

export default themr('Component', style)(Component);
```

Say, for one of the component instances you need to add some padding around the text, and also to change text color to red. You can use ad-hoc theming (`!important` keywords guarantee that adhoc style will be applied to the component instance no matter what order of themes is inside your CSS bundle):
```js
// adhoc-style.scss

.box {
  padding: 24px !important;
}

.text {
  color: red !important;
}

// Demo.jsx

import React from 'react';
import Component from './Component';
import adhocTheme from './adhoc-style.scss';

export default function Demo() {
  return (
    <div>
      <Component theme={adhocTheme} />
      <Component />
      <Component />
    </div>
  );
}
```

Say, you want to update the style of two other component instances in the same manner, using context theming. Pay attention, that in this case you do not use `!important` keywords, to avoid problems with the ad-hoc styling. Also we use SCSS `@import` to import and extend the default theme, thus keeping, despite the soft merge, default values of style rules that we do not modify.
```js
// context-style.scss

@import "style";

.box {
  // background: green; // This will be inherited from "style.scss" thanks to
  // the import.
  padding: 24px;
}

.text {
  // color: blue; // This value from "style.scss" is overriden by "color: red;" 
  // here, because this .text class stays after the .text class imported from
  // "style.scss" (the code imported on SCSS side keeps its ordering).
  color: red;
}

// Demo.jsx

import React from 'react';
import { ThemeProvider } from 'react-css-super-themr';
import Component from './Component';
import adhocTheme from './adhoc-style.scss';
import contextTheme from './context-style.scss';

export default function Demo() {
  return (
    <div>
      <Component theme={adhocTheme} />
      <ThemeProvider
        theme={{ Component: contextTheme }}
      >
        <Component /> 
        <Component />
      </ThemeProvider>
    </div>
  );
}
```

Another example: for one of the component instances we apply both context and ad-hoc styling. Ad-hoc styling is used to change the padding for the specific component instance:
```js
// adhoc-style-2.scss

.box {
  padding: 64px !important;
}

// Demo.jsx

import React from 'react';
import { ThemeProvider } from 'react-css-super-themr';
import Component from './Component';
import adhocTheme from './adhoc-style.scss';
import adhocTheme2 from './adhoc-style-2.scss';
import contextTheme from './context-style.scss';

export default function Demo() {
  return (
    <div>
      <Component theme={adhocTheme} />
      <ThemeProvider
        theme={{ Component: contextTheme }}
      >
        <Component theme={adhocTheme2} /> 
        <Component />
      </ThemeProvider>
    </div>
  );
}
```

### API Reference
#### `COMPOSE`
An object holding three constants: `COMPOSE.DEEP`, `COMPOSE.SOFT`, and `COMPOSE.SWAP`. These are the valid values for theme composition (merge) options.

#### `PRIORITY`
An object holding two constants: `PRIORITY.ADHOC_CONTEXT_DEFAULT`, and `PRIORITY.ADHOC_DEFAULT_CONTEXT`. These are the valid values for the theme priority options.

#### `themr(componentName, [defaultTheme], [options])`
Returns a `function` to wrap a component and make it themeable. The component returned by this function, apart from the props of original component, accepts:
-   `composeAdhocTheme` - Optional. Specifies how the ad-hoc theme should be merged into other themes. The valid values are those from `COMPOSE` object. Defaults to `COMPOSE.DEEP`;
-   `composeContextTheme` - Optional. Specifies how the context theme should be merged into the default one (or the default one into the context one, if their priority has been switched). Defaults to `COMPOSE.SOFT`.
-   `theme` - Optional. Ad-hoc theme;
-   `themePriority` - Optional. Specifies priorities of context and default themes. Defailts to `PRIORITY.ADHOC_CONTEXT_DEFAULT`.

Arguments of `themr(..)` itself are:
-   `componentName` *(String)* It is used to provide an unique identifier to the component, that will be used to get corresponding context theme;
-   `defaultTheme` *(Object)* Default theme, it is a classname object resolved from CSS modules.
-   `options` *(Object)* If specified, it allows to customize the behavior
    - `composeAdhocTheme` - Changes the default value of `composeAdhocTheme` prop of the wrapped object;
    - `composeContextTheme` - Changes the default value of `composeContextTheme` prop of the wrapped object;
    - `themePriority` - Changes the default value of `themePriority` prop of the wrapped object;
    - `[mapThemrProps = (props, theme) => ({ ref, theme })]` *(Function)* allows to
    customize how properties are passed down to the decorated component. By default, themr extracts all own properties passing down just `innerRef` as `ref` and the generated theme as `theme`. If you are decorating a component that needs to map the reference or any other custom property, this function is called with *all* properties given to the component plus the generated `theme` in the second parameter. It should return the properties you want to pass.

#### `<ThemeProvider theme>`
Makes available a `theme` context to be used by styled component instances. `theme` should be an object, which keys correspond to the names of themeable components (passed as the first argument into their `themr(..)` decorators), and the values are the context themes to apply.

### About
This project is licensed under the terms of the [MIT license](https://github.com/birdofpreyru/react-css-super-themr/blob/master/LICENSE).

Original package, [`react-css-themr`](https://github.com/javivelasco/react-css-themr), is authored by [Javi Velasco](http://www.javivelasco.com) as an effort of providing a better customization experience for [React Toolbox](http://www.react-toolbox.com).

This package, `react-css-super-themr` was forked from `react-css-themr@2.1.2` and customized by Dr. Sergey Pogodin aka [birdofpreyru](https://www.topcoder.com/members/birdofpreyru/).
