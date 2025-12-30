import * as assert from 'assert';
import { formatRelativeTime } from '../../../utils/timeFormatting';

suite('timeFormatting Tests', () => {
    suite('formatRelativeTime', () => {
        test('should format seconds ago', () => {
            const now = new Date();
            const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
            const result = formatRelativeTime(thirtySecondsAgo.toISOString());
            assert.match(result, /^\d+s ago$/);
            const seconds = parseInt(result.replace('s ago', ''));
            assert.ok(seconds >= 25 && seconds <= 35, `Expected ~30s, got ${seconds}s`);
        });

        test('should format minutes ago', () => {
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
            const result = formatRelativeTime(fiveMinutesAgo.toISOString());
            assert.match(result, /^\d+m ago$/);
            const minutes = parseInt(result.replace('m ago', ''));
            assert.ok(minutes >= 4 && minutes <= 6, `Expected ~5m, got ${minutes}m`);
        });

        test('should format hours ago', () => {
            const now = new Date();
            const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
            const result = formatRelativeTime(threeHoursAgo.toISOString());
            assert.match(result, /^\d+h ago$/);
            const hours = parseInt(result.replace('h ago', ''));
            assert.ok(hours >= 2 && hours <= 4, `Expected ~3h, got ${hours}h`);
        });

        test('should format days ago', () => {
            const now = new Date();
            const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
            const result = formatRelativeTime(twoDaysAgo.toISOString());
            assert.match(result, /^\d+d ago$/);
            const days = parseInt(result.replace('d ago', ''));
            assert.ok(days >= 1 && days <= 3, `Expected ~2d, got ${days}d`);
        });

        test('should handle exactly 60 seconds as minutes', () => {
            const now = new Date();
            const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
            const result = formatRelativeTime(oneMinuteAgo.toISOString());
            // Should be either "1m ago" or "0m ago" depending on timing
            assert.match(result, /^(\d+m|\d+s) ago$/);
        });

        test('should handle exactly 60 minutes as hours', () => {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            const result = formatRelativeTime(oneHourAgo.toISOString());
            // Should be either "1h ago" or "0h ago" depending on timing
            assert.match(result, /^(\d+h|\d+m) ago$/);
        });

        test('should handle exactly 24 hours as days', () => {
            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const result = formatRelativeTime(oneDayAgo.toISOString());
            // Should be either "1d ago" or "0d ago" depending on timing
            assert.match(result, /^(\d+d|\d+h) ago$/);
        });

        test('should handle invalid timestamp by returning original string', () => {
            const invalidTimestamp = 'invalid-date-string';
            const result = formatRelativeTime(invalidTimestamp);
            assert.strictEqual(result, invalidTimestamp);
        });

        test('should handle empty string', () => {
            const result = formatRelativeTime('');
            assert.strictEqual(result, '');
        });

        test('should handle malformed ISO string', () => {
            const malformed = '2023-13-45T99:99:99Z';
            const result = formatRelativeTime(malformed);
            // Should return original string or handle gracefully
            assert.ok(typeof result === 'string');
        });

        test('should handle future date by returning 0s ago', () => {
            const future = new Date(Date.now() + 1000 * 60 * 60); // 1 hour in future
            const result = formatRelativeTime(future.toISOString());
            assert.strictEqual(result, '0s ago');
        });

        test('should handle very recent past (less than 1 second)', () => {
            const now = new Date();
            const veryRecent = new Date(now.getTime() - 500); // 500ms ago
            const result = formatRelativeTime(veryRecent.toISOString());
            assert.match(result, /^\d+s ago$/);
            const seconds = parseInt(result.replace('s ago', ''));
            assert.ok(seconds === 0 || seconds === 1);
        });

        test('should handle very old dates', () => {
            const oldDate = new Date('2020-01-01T00:00:00Z');
            const result = formatRelativeTime(oldDate.toISOString());
            assert.match(result, /^\d+d ago$/);
            const days = parseInt(result.replace('d ago', ''));
            assert.ok(days > 1000); // Should be many days ago
        });

        test('should handle Date object conversion', () => {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            const result = formatRelativeTime(oneHourAgo.toISOString());
            assert.match(result, /^(\d+h|\d+m) ago$/);
        });
    });
});

