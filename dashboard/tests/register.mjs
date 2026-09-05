import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL && !/\.[a-z]+$/i.test(specifier)) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(candidate)) return next(candidate.href, context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith('.ts') && !url.includes('node_modules')) return {format:'module', shortCircuit:true, source:stripTypeScriptTypes(readFileSync(new URL(url),'utf8').replaceAll('import.meta.env', '({})'), {mode:'transform'})};
    return next(url,context);
  }
});
