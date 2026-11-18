import { copyFile } from 'node:fs/promises';

const source = new URL('../../e-transit-book/src/common/data/nigeria-states.json', import.meta.url);
const destination = new URL('../src/app/shared/utilities/nigeria-states.json', import.meta.url);
await copyFile(source, destination);
