/*
 * Copyright (C) 2017 RedHat and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
/**
 * UTF-8 BOM
 * Unicode Character 'ZERO WIDTH NO-BREAK SPACE' (U+FEFF)
 * http://www.fileformat.info/info/unicode/char/feff/index.htm
 */
const UTF8_BOM = 65279;
export function startsWithUTF8BOM(str: string): boolean {
    return (str !== null && str.length > 0 && str.charCodeAt(0) === UTF8_BOM);
}
/**
 * Determines if haystack ends with needle.
 */
export function endsWith(haystack: string, needle: string): boolean {
    const diff = haystack.length - needle.length;
    if (diff > 0) {
        return haystack.indexOf(needle, diff) === diff;
    } else if (diff === 0) {
        return haystack === needle;
    } else {
        return false;
    }
}

export function regExpLeadsToEndlessLoop(regexp: RegExp): boolean {
    // Exit early if it's one of these special cases which are meant to match
    // against an empty string
    if (regexp.source === '^' || regexp.source === '^$' || regexp.source === '$' || regexp.source === '^\\s*$') {
        return false;
    }

    // We check against an empty string. If the regular expression doesn't advance
    // (e.g. ends in an endless loop) it will match an empty string.
    const match = regexp.exec('');
    return (match !== null && <any>regexp.lastIndex === 0);
}
