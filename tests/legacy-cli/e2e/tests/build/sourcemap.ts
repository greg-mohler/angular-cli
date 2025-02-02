import * as fs from 'fs';
import { appendToFile, expectFileToExist } from '../../utils/fs';
import { ng } from '../../utils/process';

export default async function () {
  // Enable Differential loading to run both size checks
  await appendToFile('.browserslistrc', 'IE 11');

  // The below is needed to cache bundles and verify that sourcemaps are generated
  // corretly when output-hashing is disabled.
  await ng('build', '--output-hashing=bundles', '--source-map', '--configuration=development');

  await ng('build', '--output-hashing=none', '--source-map');
  await testForSourceMaps(6);

  await ng('build', '--output-hashing=none', '--source-map', '--configuration=development');
  await testForSourceMaps(8);
}

async function testForSourceMaps(expectedNumberOfFiles: number): Promise<void> {
  await expectFileToExist('dist/test-project/main-es5.js.map');
  await expectFileToExist('dist/test-project/main-es2017.js.map');

  const files = fs.readdirSync('./dist/test-project');

  let count = 0;
  for (const file of files) {
    if (!file.endsWith('.js')) {
      continue;
    }

    ++count;

    if (!files.includes(file + '.map')) {
      throw new Error('Sourcemap not generated for ' + file);
    }

    const content = fs.readFileSync('./dist/test-project/' + file, 'utf8');
    const lastLineIndex = content.lastIndexOf('\n');
    const comment = lastLineIndex !== -1 && content.slice(lastLineIndex).trim();
    if (comment !== `//# sourceMappingURL=${file}.map`) {
      throw new Error('Sourcemap comment not generated for ' + file);
    }
  }

  if (count < expectedNumberOfFiles) {
    throw new Error(
      `Javascript file count is low. Expected ${expectedNumberOfFiles} but found ${count}`,
    );
  }
}
