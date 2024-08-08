import React from 'react';
import {EditorNodeType} from '../../store/node';
import {EditorManager} from '../../manager';
import {diff, getThemeConfig} from '../../util';
import {createObjectFromChain, extractObjectChain, render} from 'amis';
import omit from 'lodash/omit';
import cx from 'classnames';

export function SchemaFrom({
  propKey,
  body,
  definitions,
  controls,
  onChange,
  value,
  env,
  api,
  popOverContainer,
  submitOnChange,
  node,
  manager,
  justify,
  ctx,
  pipeIn,
  pipeOut
}: {
  propKey?: string;
  env: any;
  body?: Array<any>;
  /**
   * @deprecated 用 body 代替
   */
  controls?: Array<any>;
  definitions?: any;
  value: any;
  api?: any;
  onChange: (
    value: any,
    diff: any,
    filter: (schema: any, value: any, id: string, diff?: any) => any
  ) => void;
  popOverContainer?: () => HTMLElement | void;
  submitOnChange?: boolean;
  node?: EditorNodeType;
  manager: EditorManager;
  panelById?: string;
  justify?: boolean;
  ctx?: any;
  pipeIn?: (value: any) => any;
  pipeOut?: (value: any, oldValue: any) => any;
}) {
  const schema = React.useMemo(() => {
    let containerKey = 'body';

    if (Array.isArray(controls)) {
      body = controls;
      containerKey = 'controls';
    }

    body = Array.isArray(body) ? body.concat() : [];

    if (submitOnChange === false) {
      body.push({
        type: 'submit',
        label: '保存',
        level: 'primary',
        block: true,
        className: 'ae-Settings-actions'
      });
    }
    const schema = {
      key: propKey,
      definitions,
      [containerKey]: body,
      className: cx(
        'config-form-content',
        'ae-Settings-content',
        'hoverShowScrollBar',
        submitOnChange === false ? 'with-actions' : ''
      ),
      wrapperComponent: 'div',
      type: 'form',
      title: '',
      mode: 'normal',
      api,
      wrapWithPanel: false,
      submitOnChange: submitOnChange !== false,
      messages: {
        validateFailed: ''
      }
    };

    if (justify) {
      schema.mode = 'horizontal';
      schema.horizontal = {
        left: 4,
        right: 8,
        justify: true
      };
    }
    return schema;
  }, [body, controls, submitOnChange]);

  const themeConfig = React.useMemo(() => getThemeConfig(), []);
  const submitSubscribers = React.useRef<Array<Function>>([]);
  const subscribeSubmit = React.useCallback(
    (
      fn: (schema: any, value: any, id: string, diff?: any) => any,
      once = false
    ) => {
      let raw = fn;
      const unsubscribe = () => {
        submitSubscribers.current = submitSubscribers.current.filter(
          item => ((item as any).__raw ?? item) !== raw
        );
      };

      if (once) {
        fn = (schema: any, value: any, id: string, diff?: any) => {
          const ret = raw(schema, value, id, diff);
          unsubscribe();
          return ret;
        };
        (fn as any).__raw = raw;
      }
      submitSubscribers.current.push(fn);
      return unsubscribe;
    },
    []
  );

  const data = React.useMemo(() => {
    value = value || {};
    const finalValue = pipeIn ? pipeIn(value) : value;

    return createObjectFromChain([
      ctx,
      themeConfig,
      ...extractObjectChain(finalValue)
    ]);
  }, [value, themeConfig, ctx]);

  return render(
    schema,
    {
      onFinished: async (newValue: any) => {
        newValue = pipeOut ? await pipeOut(newValue, value) : newValue;
        const diffValue = diff(value, newValue);
        // 没有变化时不触发onChange
        if (!diffValue) {
          return;
        }

        onChange(newValue, diffValue, (schema, value, id, diff) => {
          return submitSubscribers.current.reduce((schema, fn) => {
            return fn(schema, value, id, diff);
          }, schema);
        });
      },
      data: data,
      node: node,
      manager: manager,
      popOverContainer,
      subscribeSchemaSubmit: subscribeSubmit
    },
    {
      ...omit(env, 'replaceText')
      // theme: 'cxd' // 右侧属性配置面板固定使用cxd主题展示
    }
  );
}
