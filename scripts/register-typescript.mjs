import { registerHooks } from 'node:module'
import { readFileSync } from 'node:fs'
import { parse, compileScript } from 'vue/compiler-sfc'
import ts from 'typescript'

// Node strips TypeScript natively. Resolve the same extensionless imports Vite
// accepts, without adding a test-only transpiler or changing application imports.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context)
    } catch (error) {
      if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
        return nextResolve(`${specifier}.ts`, context)
      }
      throw error
    }
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.vue')) {
      const source = readFileSync(new URL(url), 'utf8')
      const { descriptor } = parse(source, { filename: url })
      const script = compileScript(descriptor, { id: url, inlineTemplate: true })
      const compiled = ts.transpileModule(script.content, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      })
      return { format: 'module', source: compiled.outputText, shortCircuit: true }
    }
    return nextLoad(url, context)
  },
})
