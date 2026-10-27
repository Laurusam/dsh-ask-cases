/**
 * Bundle smoke test — no browser required.
 *
 * Evaluates the built client bundle against a fake `window.__ModuleLoader__`,
 * stub React/ReactDOM and a fake slot registry, then renders the component
 * once with a stub input hook to prove the wiring does not throw.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'lib', 'client.js'), 'utf8');

function makeElement(type, props, ...children) {
  return { type, props: Object.assign({}, props, { children: children.length <= 1 ? children[0] : children }) };
}

const React = {
  createElement: makeElement,
  Fragment: 'Fragment',
  useState(init) {
    return [typeof init === 'function' ? init() : init, () => {}];
  },
  useMemo(fn) {
    return fn();
  },
  useRef(init) {
    return { current: init };
  },
  useEffect() {}
};

const ReactDOM = { createPortal: (el) => el };

const document = {
  head: { appendChild() {} },
  querySelector: () => null,
  createElement: () => ({ setAttribute() {}, textContent: '' }),
  addEventListener() {},
  removeEventListener() {},
  body: {}
};

function loadBundle() {
  let registration = null;
  const window = {
    innerWidth: 1200,
    innerHeight: 800,
    __ModuleLoader__: {
      load(def) {
        registration = def;
      }
    }
  };
  const context = vm.createContext({ window, document, Symbol, console, setTimeout, clearTimeout });
  vm.runInContext(source, context, { filename: 'client.js' });
  assert.ok(registration, 'bundle must call __ModuleLoader__.load');
  return registration;
}

function requireStub(name) {
  if (name === 'react') return React;
  if (name === 'react-dom') return ReactDOM;
  throw new Error('unexpected require: ' + name);
}

test('bundle registers under its package id with an apply/inject surface', () => {
  const reg = loadBundle();
  assert.equal(reg.id, 'dsh-ask-cases');
  const exports = reg.factory(requireStub);
  assert.equal(typeof exports.apply, 'function');
  assert.equal(Array.from(exports.inject).join(','), 'slots');
});

test('apply registers the composer button and the settings tab', () => {
  const reg = loadBundle();
  const exports = reg.factory(requireStub);
  const registered = [];
  const ctx = {
    slots: {
      inject(name, run) {
        return run();
      },
      register(def, component) {
        registered.push({ def, component });
        return () => {};
      }
    }
  };
  exports.apply(ctx);
  const names = registered.map((r) => r.def.name);
  assert.ok(names.includes('conversation.input.left'), 'composer slot');
  assert.ok(names.includes('settings.plugins.tab'), 'settings tab');
  const composer = registered.find((r) => r.def.name === 'conversation.input.left');
  assert.equal(composer.def.id, 'ask-cases');
});

test('component renders the rewrite launcher without throwing', () => {
  const reg = loadBundle();
  const exports = reg.factory(requireStub);
  let component = null;
  exports.apply({
    slots: {
      inject: (name, run) => run(),
      register: (def, Comp) => {
        if (def.name !== 'conversation.input.left') return () => {};
        component = Comp;
        return () => {};
      }
    }
  });

  const tree = component({
    inputActions: { captureInsertion: () => ({ draftRev: 1 }), insertText: () => true },
    useInput: (selector) => selector({ draft: 'PARA 方法，等相关的方法论，目的是企业协作、经验沉淀' })
  });

  assert.equal(tree.type, 'span');
  assert.ok(tree.props.children.length >= 1);
  assert.equal(tree.props.children[0].props['aria-label'], '改写我的提问');
});
