import React from 'react';
import PintoraPlay from '@theme/PintoraPlay';
import CodeBlock from '@theme-init/CodeBlock';

const withPintoraPlay = (Component) => {
  const WrappedComponent = (props) => {
    if (props.className?.includes('language-pintora') && props.play) {
      const { children: code, ...restProps } = props
      return <PintoraPlay code={code} {...restProps} />;
    }
    return <Component {...props} />;
  };

  return WrappedComponent;
};

export default withPintoraPlay(CodeBlock);
