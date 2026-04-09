#!/usr/bin/env node
/**
 * CLI for scaffolding a new EFES-NG project.
 * Usage: npm create efes-ng
 *        npx create-efes-ng
 */
import * as clack from '@clack/prompts';
import { scaffold, scaffoldQuestions, type ScaffoldAnswers } from './index';

async function main() {
    clack.intro('Create a new EFES-NG project');

    const answers: Record<string, string> = {};

    for (const question of scaffoldQuestions) {
        // Check condition
        if (question.condition && !question.condition(answers)) continue;

        let result: string | boolean | symbol;

        if (question.type === 'text') {
            const defaultVal = typeof question.defaultValue === 'function'
                ? question.defaultValue(answers)
                : question.defaultValue;

            result = await clack.text({
                message: question.label,
                placeholder: question.placeholder,
                defaultValue: defaultVal,
                validate: question.validate,
            });
        } else if (question.type === 'confirm') {
            result = await clack.confirm({
                message: question.label,
                initialValue: question.defaultValue ?? true,
            });
        } else if (question.type === 'select') {
            result = await clack.select({
                message: question.label,
                options: question.options.map(o => ({ value: o.value, label: o.label })),
                initialValue: question.defaultValue,
            });
        } else {
            continue;
        }

        if (clack.isCancel(result)) {
            clack.cancel('Cancelled.');
            process.exit(0);
        }

        answers[question.id] = String(result);
    }

    const s = clack.spinner();
    s.start('Creating project...');

    try {
        const projectDir = await scaffold(process.cwd(), answers as unknown as ScaffoldAnswers, {
            onStatus: (msg) => s.message(msg),
        });
        s.stop('Project created');
        clack.outro(`Done! Your project is at ${projectDir}\n\n  cd ${answers.projectSlug}\n  npx efes-ng run`);
    } catch (err: any) {
        s.stop('Failed');
        clack.log.error(err.message);
        process.exit(1);
    }
}

main();
