import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const androidDir = join(rootDir, 'android');
const assetsDir = join(androidDir, 'app', 'src', 'main', 'assets');
const resDir = join(androidDir, 'app', 'src', 'main', 'res');
const htmlFile = join(distDir, 'index.html');
const appHtml = join(assetsDir, 'template-astro-android.html');
const iconSource = join(rootDir, 'public', 'icon.png');
const appName = 'Mi App';
const apkName = 'template-astro-android.apk';

console.log(`\n📱 Building APK for "${appName}"...\n`);

if (!existsSync(htmlFile)) {
  console.log('📦 Building HTML first...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
}

console.log('📋 Copying HTML to Android assets...');
mkdirSync(assetsDir, { recursive: true });
copyFileSync(htmlFile, appHtml);

console.log('🎨 Generating app icons...');
if (existsSync(iconSource)) {
  const densities = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
  };

  for (const [folder, size] of Object.entries(densities)) {
    const outDir = join(resDir, folder);
    mkdirSync(outDir, { recursive: true });
    const outPath = join(outDir, 'ic_launcher.png');
    try {
      execSync(`convert "${iconSource}" -resize ${size}x${size} "${outPath}"`, { stdio: 'pipe' });
      console.log(`  ${folder}: ${size}x${size}`);
    } catch {
      copyFileSync(iconSource, outPath);
      console.log(`  ${folder}: copied (ImageMagick not available)`);
    }
  }
} else {
  console.log('  ⚠️  No icon.png found in public/, using default icons');
}

const gradlewPath = join(androidDir, 'gradlew');
if (!existsSync(gradlewPath)) {
  console.log('📥 Setting up Gradle wrapper...');
  const wrapperDir = join(androidDir, 'gradle', 'wrapper');
  mkdirSync(wrapperDir, { recursive: true });

  const jarPath = join(wrapperDir, 'gradle-wrapper.jar');
  if (!existsSync(jarPath)) {
    try {
      execSync(
        'curl -sL https://raw.githubusercontent.com/gradle/gradle/v8.7.0/gradle/wrapper/gradle-wrapper.jar -o "' + jarPath + '"',
        { stdio: 'pipe' }
      );
    } catch {
      console.log('  ⚠️  Could not download gradle-wrapper.jar');
    }
  }

  writeFileSync(
    gradlewPath,
    `#!/bin/sh\nexec java -jar "$APP_HOME/gradle/wrapper/gradle-wrapper.jar" "$@"\n`
  );
  execSync('chmod +x "' + gradlewPath + '"');
}

const localProps = join(androidDir, 'local.properties');
if (!existsSync(localProps)) {
  const androidHome = process.env.ANDROID_HOME || join(process.env.HOME || '/root', '.android', 'sdk');
  writeFileSync(localProps, `sdk.dir=${androidHome}\n`);
  console.log(`  Created local.properties with sdk.dir=${androidHome}`);
}

console.log('\n🔨 Building APK...\n');
execSync('./gradlew assembleDebug --no-daemon', { cwd: androidDir, stdio: 'inherit' });

const debugApk = join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
if (existsSync(debugApk)) {
  const outApk = join(distDir, apkName);
  copyFileSync(debugApk, outApk);
  console.log(`\n✅ APK ready: dist/${apkName}`);
  const stats = readFileSync(outApk);
  console.log(`   Size: ${(stats.length / 1024).toFixed(1)} KB\n`);
} else {
  console.error('\n❌ APK not found at expected path');
  process.exit(1);
}
