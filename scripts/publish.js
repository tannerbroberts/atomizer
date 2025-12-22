const { execSync } = require('child_process');
const readline = require('readline');
const chalk = require('chalk');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function run() {
  console.log(chalk.blue('\n🚀 Preparing to publish to @tannerbroberts/atomizer\n'));

  const versionType = await new Promise((resolve) => {
    rl.question(
      chalk.yellow('What type of version change is this? (patch, minor, major) [patch]: '),
      (answer) => {
        resolve(answer.trim().toLowerCase() || 'patch');
      }
    );
  });

  if (!['patch', 'minor', 'major'].includes(versionType)) {
    console.error(chalk.red(`\n❌ Invalid version type: ${versionType}. Must be patch, minor, or major.`));
    process.exit(1);
  }

  try {
    console.log(chalk.gray(`\nIncrementing version (${versionType})...`));
    execSync(`npm version ${versionType}`, { stdio: 'inherit' });

    console.log(chalk.gray('\nPublishing to npm...'));
    execSync('npm publish --access public', { stdio: 'inherit' });

    console.log(chalk.green('\n✅ Successfully published update!'));
  } catch (error) {
    console.error(chalk.red('\n❌ Failed to publish:'), error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

run();
