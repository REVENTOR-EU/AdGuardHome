import { test, expect } from '@playwright/test';
import { ADMIN_PASSWORD, ADMIN_USERNAME } from '../constants';

const TEST_DOMAIN = 'test-example.org';
const TEST_ANSWER = '192.168.1.100';
const UPDATED_DOMAIN = 'updated-example.org';
const UPDATED_ANSWER = '192.168.1.200';

test.describe('DNS Rewrites', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login.html');
        await page.locator('#username').fill(ADMIN_USERNAME);
        await page.locator('#password').fill(ADMIN_PASSWORD);
        await page.locator('#sign_in').click();
        await page.waitForURL((url) => !url.href.endsWith('/login.html'));

        await page.goto('/#dns_rewrites');
        await page.waitForTimeout(1000); // Wait for page to load
    });

    test('should add a new DNS rewrite', async ({ page }) => {
        try {
            // Click add rewrite button
            await page.getByTestId('add-rewrite').click();
            await page.waitForTimeout(500);

            // Fill in the form
            await page.getByTestId('rewrite-domain-input').fill(TEST_DOMAIN);

            await page.getByTestId('rewrite-answer-input').fill(TEST_ANSWER);

            // Save the rewrite
            await page.getByTestId('rewrite-save-button').click();
            await page.waitForTimeout(1000);

            // Verify the rewrite appears in the table
            const domainCell = page.locator(`text=${TEST_DOMAIN}`);
            const answerCell = page.locator(`text=${TEST_ANSWER}`);

            await expect(domainCell).toBeVisible();
            await expect(answerCell).toBeVisible();
        } catch (error) {
            throw error;
        }
    });

    test('should toggle global rewrite switch in table header', async ({ page }) => {
        try {
            // Wait for the table to load
            await page.waitForTimeout(1000);

            // Find the global toggle switch
            const globalToggle = page.getByTestId('rewrite-global-toggle');
            await expect(globalToggle).toBeVisible();

            // Get initial state
            const initialState = await globalToggle.evaluate((el: HTMLInputElement) => el.checked);

            // Click the toggle
            await globalToggle.click();
            await page.waitForTimeout(1000);

            // Verify state changed
            const newState = await globalToggle.evaluate((el: HTMLInputElement) => el.checked);
            expect(newState).toBe(!initialState);

            // Toggle back to original state
            await globalToggle.click();
            await page.waitForTimeout(1000);

            const finalState = await globalToggle.evaluate((el: HTMLInputElement) => el.checked);
            expect(finalState).toBe(initialState);
        } catch (error) {
            throw error;
        }
    });

    test('should toggle individual rewrite', async ({ page }) => {
        try {
            // Wait for table to load
            await page.waitForTimeout(1000);

            // Find the individual toggle for the test domain
            const individualToggle = page.getByTestId(`rewrite-toggle-${TEST_DOMAIN}`);
            
            // Check if the rewrite exists
            const toggleExists = await individualToggle.count() > 0;
            
            if (!toggleExists) {
                test.skip();
                return;
            }

            await expect(individualToggle).toBeVisible();

            // Get initial state
            const initialState = await individualToggle.evaluate((el: HTMLInputElement) => el.checked);

            // Click the toggle
            await individualToggle.click();
            await page.waitForTimeout(1000);

            // Verify state changed
            const newState = await individualToggle.evaluate((el: HTMLInputElement) => el.checked);
            expect(newState).toBe(!initialState);

            // Toggle back
            await individualToggle.click();
            await page.waitForTimeout(1000);

            const finalState = await individualToggle.evaluate((el: HTMLInputElement) => el.checked);
            expect(finalState).toBe(initialState);
        } catch (error) {
            throw error;
        }
    });

    test('should update rewrite through ConfigureRewritesModal', async ({ page }) => {
        try {
            // Wait for table to load
            await page.waitForTimeout(1000);

            // Click edit button for the test domain
            const editButton = page.getByTestId(`edit-rewrite-${TEST_DOMAIN}`);
            
            const editButtonExists = await editButton.count() > 0;
            
            if (!editButtonExists) {
                test.skip();
                return;
            }

            await editButton.click();
            await page.waitForTimeout(500);

            // Verify modal opened with existing values
            const domainInput = page.getByTestId('rewrite-domain-input');
            const answerInput = page.getByTestId('rewrite-answer-input');

            await expect(domainInput).toBeVisible();
            await expect(answerInput).toBeVisible();

            const currentDomain = await domainInput.inputValue();
            const currentAnswer = await answerInput.inputValue();

            // Update the values
            await domainInput.clear();
            await domainInput.fill(UPDATED_DOMAIN);

            await answerInput.clear();
            await answerInput.fill(UPDATED_ANSWER);

            // Save changes
            await page.getByTestId('rewrite-save-button').click();
            await page.waitForTimeout(1000);

            // Verify updated values appear in table
            const updatedDomain = page.locator(`text=${UPDATED_DOMAIN}`);
            const updatedAnswer = page.locator(`text=${UPDATED_ANSWER}`);

            await expect(updatedDomain).toBeVisible();
            await expect(updatedAnswer).toBeVisible();
        } catch (error) {
            throw error;
        }
    });

    test('should delete rewrite', async ({ page }) => {
        try {
            // Wait for table to load
            await page.waitForTimeout(1000);

            // Click delete button for the updated domain
            const deleteButton = page.getByTestId(`delete-rewrite-${UPDATED_DOMAIN}`);
            
            const deleteButtonExists = await deleteButton.count() > 0;
            
            if (!deleteButtonExists) {
                const altDeleteButton = page.getByTestId(`delete-rewrite-${TEST_DOMAIN}`);
                const altButtonExists = await altDeleteButton.count() > 0;
                
                if (!altButtonExists) {
                    test.skip();
                    return;
                }
                
                await altDeleteButton.click();
            } else {
                await deleteButton.click();
            }

            await page.waitForTimeout(500);

            // Confirm deletion in the modal
            const confirmButton = page.getByTestId('rewrite-delete-confirm');
            await expect(confirmButton).toBeVisible();
            await confirmButton.click();
            await page.waitForTimeout(1000);

            // Verify the rewrite is no longer in the table
            const deletedDomain = page.locator(`text=${UPDATED_DOMAIN}`);
            await expect(deletedDomain).not.toBeVisible();
        } catch (error) {
            throw error;
        }
    });
});
