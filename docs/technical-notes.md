# Notas técnicas

## Pretext

`@chenglou/pretext` es una librería de layout y medición de texto en JavaScript/TypeScript. Su caso fuerte es calcular líneas, alturas y rangos de texto sin medir DOM. Usa `Intl.Segmenter` y `canvas.measureText`, y ofrece APIs como `prepareWithSegments()` y `layoutWithLines()` para layouts manuales.

Fuentes revisadas:

- https://github.com/chenglou/pretext
- https://www.mintlify.com/chenglou/pretext/guides/manual-layout
- https://www.mintlify.com/chenglou/pretext/installation

### Decisión actual

Por ahora el prototipo no usa `pretext` en runtime.

Motivo: la versión anterior calculaba el orden de cadena con `pretext`, pero calculaba las posiciones reales con nuestro layout manual. Si ambas formas de cortar líneas no coinciden exactamente, las constraints físicas conectan letras que visualmente no son vecinas. Eso puede hacer que el hilo se quede pillado, tire raro o arranque grupos de letras/lineas de manera poco controlada.

La regla para el motor físico queda:

- La posición visual de cada grafema y el orden de la cadena deben salir del mismo sistema de layout.
- Si usamos `pretext`, debe ser la fuente única para líneas, posiciones y orden; no solo para una parte.

### Cuándo recuperarla

Merece reconsiderar `pretext` cuando:

- necesitemos mejor soporte multilenguaje y bidi;
- queramos line breaking más cercano a CSS;
- empecemos layouts de texto sobre paths o formas variables;
- pasemos a Canvas/SVG/WebGL y necesitemos rangos de línea fiables;
- queramos optimizar medición/reflow con muchos bloques.

Para integrarla bien habría que envolverla en un adapter de layout:

```js
function layoutParagraphWithPretext(block, maxWidth, startY) {
  return {
    positions,
    lineIndices,
    height
  };
}
```

Ese adapter debe devolver exactamente la misma estructura que el layout manual actual, incluyendo `positions` y `lineIndices`.

### Nota de instalación

La librería es ESM-only y requiere entorno de navegador para `prepare()`/`prepareWithSegments()` porque depende de Canvas e `Intl.Segmenter`. Si el proyecto pasa a bundler, se puede instalar con:

```sh
npm install @chenglou/pretext
```

