import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestError,
  TestResult,
} from '@playwright/test/reporter';

// e2e/tests/ 直下のフォルダ名 → 一覧の先頭に表示する分類名。フォルダを追加したらここにも追加する
const CATEGORY_LABELS: Record<string, string> = {
  app: 'アプリ全体',
  auth: '認証',
  follow: 'フォロー',
  record: '記録',
  storage: '画像アップロード',
};

// 区切りや省略記号に「›」「…」を使うと、曖昧幅の文字を全角で描く設定のターミナルで列がずれるためASCIIにする
const SEPARATOR = ' > ';
const ELLIPSIS = '...';
const NAME_MAX_WIDTH = 80;
// 「(1m02s)」「(999ms)」が収まる幅
const TIME_WIDTH = 7;
const FRAME_INTERVAL_MS = 100;

type Status = 'running' | 'passed' | 'failed' | 'skipped';

type Row = {
  index: number;
  test: TestCase;
  result: TestResult;
  category: string;
  rest: string;
  status: Status;
};

const useColor = process.env.FORCE_COLOR
  ? process.env.FORCE_COLOR !== '0'
  : !!process.stdout.isTTY && !process.env.NO_COLOR;

const paint = (code: number) => (s: string) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const green = paint(32);
const red = paint(31);
const yellow = paint(33);
const dim = paint(2);
const gray = paint(90);

// ターミナル上の表示幅。日本語などの全角文字は2、結合文字・制御文字は0として数える
function charWidth(cp: number): number {
  if (cp < 0x20 || (cp >= 0x7f && cp < 0xa0)) return 0;
  if ((cp >= 0x300 && cp <= 0x36f) || cp === 0x200b || cp === 0x200d) return 0;
  if (cp >= 0xfe00 && cp <= 0xfe0f) return 0;
  if (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0xa4cf && cp !== 0x303f) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe4f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f300 && cp <= 0x1faff) ||
    (cp >= 0x20000 && cp <= 0x3fffd)
  ) {
    return 2;
  }
  return 1;
}

function textWidth(s: string): number {
  let width = 0;
  for (const ch of s) width += charWidth(ch.codePointAt(0)!);
  return width;
}

// テスト名は末尾ほど具体的なので、はみ出した分は先頭側を省略する
function truncateStart(s: string, width: number): string {
  if (textWidth(s) <= width) return s;
  const chars = Array.from(s);
  let kept = '';
  let keptWidth = 0;
  for (let i = chars.length - 1; i >= 0; i--) {
    const w = charWidth(chars[i].codePointAt(0)!);
    if (keptWidth + w > width - ELLIPSIS.length) break;
    kept = chars[i] + kept;
    keptWidth += w;
  }
  return ELLIPSIS + kept;
}

const padEnd = (s: string, width: number) => s + ' '.repeat(Math.max(0, width - textWidth(s)));

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.floor(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`;
}

const indent = (s: string, n: number) =>
  s
    .split('\n')
    .map((line) => (line ? ' '.repeat(n) + line : line))
    .join('\n');

/**
 * 実行を開始した順にテストを1行ずつ並べ、実行中は経過時間を、終了後は ✓ / ✘ と所要時間を表示する。
 *
 * ターミナルでは専用の画面（vim や less と同じ代替スクリーン）に切り替え、画面に入る最新の行を
 * 一定間隔で丸ごと描き直す。通常の画面だと上に流れた行はもう書き換えられないため。
 * 終了後は元の画面に戻り、全テストの一覧を開始順に出し直してから、失敗したテストの詳細とサマリーを出力する。
 * CIなどターミナル以外への出力では行を書き換えられないため、それより前に始まったテストが全て終わった行から
 * 開始順に1行ずつ出力する。
 */
class StudyLogReporter implements Reporter {
  private readonly live = !!process.stdout.isTTY && !process.env.CI;
  // --list では Playwright 標準の一覧表示に任せる（printsToStdio が false だと自動で追加される）
  private readonly listMode = process.argv.includes('--list');
  private printedCount = 0;
  private config!: FullConfig;
  private total = 0;
  private rows: Row[] = [];
  private rowByResult = new Map<TestResult, Row>();
  private unknownCategories = new Set<string>();
  private errors: TestError[] = [];
  private bufferedOutput: string[] = [];
  private startedAt = Date.now();
  private timer: NodeJS.Timeout | undefined;
  private inAltScreen = false;

  printsToStdio() {
    return !this.listMode;
  }

  onBegin(config: FullConfig, suite: Suite) {
    if (this.listMode) return;
    this.config = config;
    this.total = suite.allTests().length;
    this.startedAt = Date.now();
    if (!this.live) {
      process.stdout.write(`\n${this.total}件のテストを${this.workers()}並列で実行します\n\n`);
    }
  }

  onTestBegin(test: TestCase, result: TestResult) {
    // globalSetup などの出力を消さないよう、最初のテストが始まってから専用の画面に切り替える
    if (this.live && !this.inAltScreen && this.rows.length === 0) this.enterAltScreen();
    this.addRow(test, result);
    if (this.inAltScreen) this.render();
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const row = this.rowByResult.get(result) ?? this.addRow(test, result);
    row.status =
      result.status === 'skipped'
        ? 'skipped'
        : result.status === test.expectedStatus
          ? 'passed'
          : 'failed';

    if (!this.live) {
      this.printFinishedRows();
    } else if (this.rows.length >= this.total && this.rows.every((r) => r.status !== 'running')) {
      // globalTeardown の出力が専用の画面に書かれて消えないよう、全テストが終わった時点で元の画面に戻す
      this.leaveAltScreen();
    } else {
      this.render();
    }
  }

  onStdOut(chunk: string | Buffer, test?: TestCase) {
    // テスト内の出力は result.stdout に残るので、失敗時の詳細でまとめて出す
    if (!test) this.writeOutside(chunk.toString());
  }

  onStdErr(chunk: string | Buffer, test?: TestCase) {
    if (!test) this.writeOutside(chunk.toString());
  }

  onError(error: TestError) {
    if (this.listMode) return;
    this.errors.push(error);
  }

  onEnd(result: FullResult) {
    if (this.listMode) return;
    this.leaveAltScreen();
    // 中断などで終わらなかった行も、実行中の表示のまま出しておく
    if (!this.live) this.printFinishedRows(true);
    const out: string[] = [];

    const failed = this.rows.filter((r) => r.status === 'failed');
    if (failed.length > 0) {
      out.push('', red(`失敗したテスト (${failed.length}件)`), '');
      for (const row of failed) out.push(this.formatFailure(row), '');
    }

    for (const error of this.errors) {
      out.push('', red('テスト以外でエラーが発生しました'), indent(this.formatError(error), 4));
    }

    if (this.unknownCategories.size > 0) {
      out.push(
        '',
        yellow(
          `分類名が登録されていないフォルダがあります: ${[...this.unknownCategories].join(', ')}` +
            '（e2e/reporter.ts の CATEGORY_LABELS に追加してください）',
        ),
      );
    }

    const count = (status: Status) => this.rows.filter((r) => r.status === status).length;
    const passed = count('passed');
    const skipped = count('skipped');
    const notRun = this.total - this.rows.filter((r) => r.status !== 'running').length;
    const summary = [
      green(`成功 ${passed}件`),
      failed.length > 0 ? red(`失敗 ${failed.length}件`) : `失敗 0件`,
      ...(skipped > 0 ? [yellow(`スキップ ${skipped}件`)] : []),
      ...(notRun > 0 ? [yellow(`未完了 ${notRun}件`)] : []),
    ].join('  ');
    out.push('', `  ${summary}  ${dim(`(${formatDuration(result.duration)})`)}`);
    if (result.status === 'interrupted') out.push(yellow('  実行が中断されました'));
    if (result.status === 'timedout') out.push(red('  全体の制限時間を超えました'));

    process.stdout.write(out.join('\n') + '\n\n');
  }

  private printFinishedRows(all = false) {
    while (this.printedCount < this.rows.length) {
      const row = this.rows[this.printedCount];
      if (!all && row.status === 'running') break;
      process.stdout.write(this.formatRow(row, NAME_MAX_WIDTH) + '\n');
      this.printedCount++;
    }
  }

  private workers() {
    return Math.min(this.config.workers, this.total);
  }

  private addRow(test: TestCase, result: TestResult): Row {
    const [folder, ...restOfPath] = path
      .relative(test.parent.project()?.testDir ?? this.config.rootDir, test.location.file)
      .split(path.sep);
    let category = '';
    if (restOfPath.length > 0) {
      category = CATEGORY_LABELS[folder] ?? folder;
      if (!(folder in CATEGORY_LABELS)) this.unknownCategories.add(folder);
    }
    // titlePath() は [ルート, プロジェクト名, ファイル名, ...describe, テスト名] の順
    const titles = test.titlePath().slice(3);
    const retry = result.retry > 0 ? ` (リトライ${result.retry}回目)` : '';

    const row: Row = {
      index: this.rows.length + 1,
      test,
      result,
      category,
      rest: titles.join(SEPARATOR) + retry,
      status: 'running',
    };
    this.rows.push(row);
    this.rowByResult.set(result, row);
    return row;
  }

  private formatIndex(index: number) {
    const digits = String(Math.max(this.total, this.rows.length)).length;
    return `[${String(index).padStart(digits)}/${this.total}]`;
  }

  private formatName(row: Row, width: number) {
    if (!row.category) return truncateStart(row.rest, width);
    // 分類は常に残し、はみ出した分はその後ろの describe 名側から省略する
    const prefix = row.category + SEPARATOR;
    const restWidth = width - textWidth(prefix);
    if (restWidth < ELLIPSIS.length + 4) return truncateStart(prefix + row.rest, width);
    return prefix + truncateStart(row.rest, restWidth);
  }

  private formatRow(row: Row, nameWidth: number) {
    const symbol = {
      running: ' ',
      passed: green('✓'),
      failed: red('✘'),
      skipped: yellow('-'),
    }[row.status];
    const elapsed =
      row.status === 'running' ? Date.now() - row.result.startTime.getTime() : row.result.duration;
    const time = row.status === 'skipped' ? '' : `(${formatDuration(elapsed)})`;
    const name = padEnd(this.formatName(row, nameWidth), nameWidth);
    return `  ${symbol}  ${this.formatIndex(row.index)}  ${name}  ${gray(time.padStart(TIME_WIDTH))}`;
  }

  private nameWidth(columns: number) {
    // 記号・番号・時間の列と、その間の空白の幅を引いた残りを名前の列にする
    const fixed = 2 + 1 + 2 + this.formatIndex(1).length + 2 + 2 + TIME_WIDTH;
    return Math.max(10, Math.min(NAME_MAX_WIDTH, columns - fixed - 1));
  }

  private render() {
    const columns = process.stdout.columns || 80;
    const height = process.stdout.rows || 24;
    const nameWidth = this.nameWidth(columns);

    const done = this.rows.filter((r) => r.status !== 'running').length;
    const failed = this.rows.filter((r) => r.status === 'failed').length;
    const header = `  ${this.total}件のテストを${this.workers()}並列で実行中`;
    const footer = [
      `  完了 ${done}/${this.total}`,
      failed > 0 ? red(`失敗 ${failed}件`) : '失敗 0件',
      dim(`経過 ${formatDuration(Date.now() - this.startedAt)}`),
    ].join('  ');

    // 見出し・空行・空行・フッターの4行を除いた高さに、最新の行から入るだけ表示する
    const body = this.rows.slice(-Math.max(1, height - 4)).map((r) => this.formatRow(r, nameWidth));
    const lines = [header, '', ...body, '', footer];
    // 最終行の後に改行を書くと画面がスクロールするため、行の間にだけ改行を入れる
    process.stdout.write('\x1b[H' + lines.map((l) => l + '\x1b[K').join('\n') + '\x1b[J');
  }

  private enterAltScreen() {
    this.inAltScreen = true;
    process.stdout.write('\x1b[?1049h\x1b[?25l');
    process.on('exit', this.restoreTerminal);
    this.timer = setInterval(() => this.render(), FRAME_INTERVAL_MS);
    this.render();
  }

  private leaveAltScreen() {
    if (!this.inAltScreen) return;
    clearInterval(this.timer);
    this.restoreTerminal();
    process.off('exit', this.restoreTerminal);
    // 専用の画面の内容は戻ると消えるため、見返せるよう通常の画面に全件を出し直す
    const nameWidth = this.nameWidth(process.stdout.columns || 80);
    const list = this.rows.map((r) => this.formatRow(r, nameWidth));
    process.stdout.write(
      `\n  ${this.total}件のテストを${this.workers()}並列で実行\n\n${list.join('\n')}\n`,
    );
    process.stdout.write(this.bufferedOutput.join(''));
    this.bufferedOutput = [];
  }

  // 異常終了しても、ターミナルが専用の画面・カーソル非表示のまま残らないようにする
  private restoreTerminal = () => {
    if (!this.inAltScreen) return;
    this.inAltScreen = false;
    process.stdout.write('\x1b[?25h\x1b[?1049l');
  };

  private writeOutside(text: string) {
    if (this.inAltScreen) this.bufferedOutput.push(text);
    else process.stdout.write(text);
  }

  private formatFailure(row: Row) {
    const { test, result } = row;
    const location = `${path.relative(process.cwd(), test.location.file)}:${test.location.line}:${test.location.column}`;
    const parts = [
      `  ${red('✘')} ${this.formatIndex(row.index)} ${row.category ? row.category + SEPARATOR : ''}${row.rest}`,
      dim(`    ${location}`),
    ];
    for (const error of result.errors) parts.push('', indent(this.formatError(error), 4));

    const output = [...result.stdout, ...result.stderr].map((c) => c.toString()).join('');
    if (output.trim()) parts.push('', dim('    出力:'), indent(output.trimEnd(), 6));

    const trace = result.attachments.find((a) => a.name === 'trace' && a.path);
    if (trace?.path) {
      parts.push(
        '',
        dim(
          `    トレース: pnpm exec playwright show-trace ${path.relative(process.cwd(), trace.path)}`,
        ),
      );
    }
    return parts.join('\n');
  }

  private formatError(error: TestError) {
    const text = [error.message ?? error.value ?? '', error.snippet ?? '']
      .filter(Boolean)
      .join('\n\n');
    return useColor ? text : stripVTControlCharacters(text);
  }
}

export default StudyLogReporter;
