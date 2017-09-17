import React, { Component } from 'react'
import PT from 'prop-types'
import hoistNonReactStatics from 'hoist-non-react-statics'
import invariant from 'invariant'

/**
 * @typedef {Object.<string, TReactCSSThemrTheme>} TReactCSSThemrTheme
 */

/**
 * @typedef {{}} TReactCSSThemrOptions
 * @property {String|Boolean} [composeTheme=COMPOSE_DEEPLY]
 */

const COMPOSE_DEEPLY = 'deeply'
const COMPOSE_SOFTLY = 'softly'
const DONT_COMPOSE = false

/* Valid composition options. */
export const COMPOSE = {
  DEEP: COMPOSE_DEEPLY,
  SOFT: COMPOSE_SOFTLY,
  SWAP: DONT_COMPOSE,
};

/* Valid priority options. */
export const PRIORITY = {
  ADHOC_CONTEXT_DEFAULT: 'adhoc-context-default',
  ADHOC_DEFAULT_CONTEXT: 'adhoc-default-context',
};

const DEFAULT_OPTIONS = {
  composeAdhocTheme: COMPOSE.DEEP,
  composeContextTheme: COMPOSE.SOFT,
  mapThemrProps: defaultMapThemrProps,
  themePriority: PRIORITY.ADHOC_CONTEXT_DEFAULT,
};

const COMPOSE_TYPE = PT.oneOf([COMPOSE.DEEP, COMPOSE.SOFT, COMPOSE.SWAP]);
const PRIORITY_TYPE = PT.oneOf([
  PRIORITY.ADHOC_CONTEXT_DEFAULT, PRIORITY.ADHOC_DEFAULT_CONTEXT]);

/* Valid types of themr(..) options. */
const optionTypes = {
  composeAdhocTheme: COMPOSE_TYPE.isRequired,
  composeContextTheme: PT.oneOf([COMPOSE.SOFT, COMPOSE.SWAP]).isRequired,
  mapThemrProps: PT.func.isRequired,
  themePriority: PRIORITY_TYPE.isRequired,
};

const THEMR_CONFIG = typeof Symbol !== 'undefined' ?
  Symbol('THEMR_CONFIG') :
  '__REACT_CSS_THEMR_CONFIG__'

/* TODO: localTheme should be renamed into defaultTheme, to avoid confusion. */

/**
 * Themr decorator
 * @param {String|Number|Symbol} componentName - Component name
 * @param {TReactCSSThemrTheme} [localTheme] - Base theme
 * @param {{}} [options] - Themr options
 * @returns {function(ThemedComponent:Function):Function} - ThemedComponent
 */
export default (componentName, localTheme, options = {}) => (ThemedComponent) => {
  const ops = { ...DEFAULT_OPTIONS, ...options};
  PT.checkPropTypes(optionTypes, ops, 'option', 'themr(..)')

  let config = ThemedComponent[THEMR_CONFIG]
  if (config && config.componentName === componentName) {
    config.localTheme = themeable(config.localTheme, localTheme)
    return ThemedComponent
  }

  config = {
    componentName,
    localTheme
  }

  /**
   * @property {{wrappedInstance: *}} refs
   */
  class Themed extends Component {
    static displayName = `Themed${ThemedComponent.name}`;

    static contextTypes = {
      themr: PT.object
    }

    static propTypes = {
      ...ThemedComponent.propTypes,
      composeAdhocTheme: COMPOSE_TYPE,
      composeContextTheme: PT.oneOf([COMPOSE.SOFT, COMPOSE.SWAP]),
      innerRef: PT.func,
      mapThemrProps: PT.func,
      theme: PT.object,
      themeNamespace: PT.string,
      themePriority: PRIORITY_TYPE,
    }

    static defaultProps = {
      ...ThemedComponent.defaultProps,
      composeAdhocTheme: ops.composeAdhocTheme,
      composeContextTheme: ops.composeContextTheme,
      mapThemrProps: ops.mapThemrProps,
      themePriority: ops.themePriority,
    }

    constructor(...args) {
      super(...args)
      this.theme_ = this.calcTheme(this.props)
    }

    getWrappedInstance() {
      invariant(true,
        'DEPRECATED: To access the wrapped instance, you have to pass ' +
        '{ innerRef: fn } and retrieve with a callback ref style.'
      )

      return this.refs.wrappedInstance
    }

    getNamespacedTheme(props) {
      const { themeNamespace, theme } = props
      if (!themeNamespace) return theme
      if (themeNamespace && !theme) throw new Error('Invalid themeNamespace use in react-css-themr. ' +
        'themeNamespace prop should be used only with theme prop.')

      return Object.keys(theme)
        .filter(key => key.startsWith(themeNamespace))
        .reduce((result, key) => ({ ...result, [removeNamespace(key, themeNamespace)]:  theme[key] }), {})
    }

    getThemeNotComposed(props) {
      if (props.theme) return this.getNamespacedTheme(props)
      if (config.localTheme) return config.localTheme
      return this.getContextTheme()
    }

    getContextTheme() {
      return this.context.themr
        ? this.context.themr.theme[config.componentName]
        : {}
    }

    getTheme(props) {
      return props.composeTheme === COMPOSE_SOFTLY
        ? {
          ...this.getContextTheme(),
          ...config.localTheme,
          ...this.getNamespacedTheme(props)
        }
        : themeable(
          themeable(this.getContextTheme(), config.localTheme),
          this.getNamespacedTheme(props)
        )
    }

    calcTheme(props) {
      if (props.composeAdhocTheme === COMPOSE.SWAP) {
        return this.getNamespacedTheme(props) || {};
      }
      let theme;
      if (props.composeContextTheme === COMPOSE.SWAP) {
        theme = props.themePriority === PRIORITY.ADHOC_CONTEXT_DEFAULT
          ? this.getContextTheme() : config.localTheme;
      } else { /* props.composeContextTheme equals COMPOSE.SOFT */
        theme = props.themePriority === PRIORITY.ADHOC_CONTEXT_DEFAULT
          ? { ...config.localTheme, ...this.getContextTheme() }
          : { ...this.getContextTheme(), ...config.localTheme };
      }
      theme = props.composeAdhocTheme === COMPOSE.SOFT
        ? { ...theme, ...this.getNamespacedTheme(props) }
        : themeable(this.getNamespacedTheme(props), theme);
      return theme;
    }

    componentWillReceiveProps(nextProps) {
      if (
        nextProps.composeAdhocTheme !== this.props.composeAdhocTheme ||
        nextProps.composeContextTheme !== this.props.composeAdhocTheme ||
        nextProps.theme !== this.props.theme ||
        nextProps.themeNamespace !== this.props.themeNamespace ||
        nextProps.themePriority !== this.props.themePriority
      ) {
        this.theme_ = this.calcTheme(nextProps)
      }
    }

    render() {
      return React.createElement(
        ThemedComponent,
        this.props.mapThemrProps(this.props, this.theme_)
      )
    }
  }

  Themed[THEMR_CONFIG] = config

  return hoistNonReactStatics(Themed, ThemedComponent)
}

/**
 * Merges passed themes by concatenating string keys and processing nested themes
 *
 * @param {...TReactCSSThemrTheme} themes - Themes
 * @returns {TReactCSSThemrTheme} - Resulting theme
 */
export function themeable(...themes) {
  return themes.reduce((acc, theme) => merge(acc, theme), {})
}

/**
 * @param {TReactCSSThemrTheme} [original] - Original theme
 * @param {TReactCSSThemrTheme} [mixin] - Mixin theme
 * @returns {TReactCSSThemrTheme} - resulting theme
 */
function merge(original = {}, mixin = {}) {
  //make a copy to avoid mutations of nested objects
  //also strip all functions injected by isomorphic-style-loader
  const result = Object.keys(original).reduce((acc, key) => {
    const value = original[key]
    if (typeof value !== 'function') {
      acc[key] = value
    }
    return acc
  }, {})

  //traverse mixin keys and merge them to resulting theme
  Object.keys(mixin).forEach(key => {
    //there's no need to set any defaults here
    const originalValue = result[key]
    const mixinValue = mixin[key]

    switch (typeof mixinValue) {
      case 'object': {
        //possibly nested theme object
        switch (typeof originalValue) {
          case 'object': {
            //exactly nested theme object - go recursive
            result[key] = merge(originalValue, mixinValue)
            break
          }

          case 'undefined': {
            //original does not contain this nested key - just take it as is
            result[key] = mixinValue
            break
          }

          default: {
            //can't merge an object with a non-object
            throw new Error(`You are merging object ${key} with a non-object ${originalValue}`)
          }
        }
        break
      }

      case 'undefined': //fallthrough - handles accidentally unset values which may come from props
      case 'function': {
        //this handles issue when isomorphic-style-loader addes helper functions to css-module
        break //just skip
      }

      default: {
        //plain values
        switch (typeof originalValue) {
          case 'object': {
            //can't merge a non-object with an object
            throw new Error(`You are merging non-object ${mixinValue} with an object ${key}`)
          }

          case 'undefined': {
            //mixin key is new to original theme - take it as is
            result[key] = mixinValue
            break
          }
          case 'function': {
            //this handles issue when isomorphic-style-loader addes helper functions to css-module
            break //just skip
          }

          default: {
            //finally we can merge
            result[key] = originalValue.split(' ')
              .concat(mixinValue.split(' '))
              .filter((item, pos, self) => self.indexOf(item) === pos && item !== '')
              .join(' ')
            break
          }
        }
        break
      }
    }
  })

  return result
}

/**
 * Removes namespace from key
 *
 * @param {String} key - Key
 * @param {String} themeNamespace - Theme namespace
 * @returns {String} - Key
 */
function removeNamespace(key, themeNamespace) {
  const capitalized = key.substr(themeNamespace.length)
  return capitalized.slice(0, 1).toLowerCase() + capitalized.slice(1)
}

/**
 * Maps props and theme to an object that will be used to pass down props to the
 * decorated component.
 *
 * @param {Object} ownProps - All props given to the decorated component
 * @param {Object} theme - Calculated then that should be passed down
 * @returns {Object} - Props that will be passed down to the decorated component
 */
function defaultMapThemrProps(ownProps, theme) {
  const {
    composeAdhocTheme,   //eslint-disable-line no-unused-vars
    composeContextTheme, // eslint-disable-line no-unused-vars
    innerRef,
    themeNamespace, //eslint-disable-line no-unused-vars
    mapThemrProps,  //eslint-disable-line no-unused-vars
    themePriority, // eslint-disable-line no-unused-vars
    ...rest
  } = ownProps

  return {
    ...rest,
    ref: innerRef,
    theme
  }
}
