#!/usr/bin/env node
import { __name } from './chunk-EWOJGXRX.js';
import { nanoid } from 'nanoid';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';
function generateId(prefix) {
  const id = nanoid();
  return prefix ? `${prefix}-${id}` : id;
}
__name(generateId, "generateId");

export { generateId };
//# sourceMappingURL=chunk-KJWKY4L4.js.map
//# sourceMappingURL=chunk-KJWKY4L4.js.map