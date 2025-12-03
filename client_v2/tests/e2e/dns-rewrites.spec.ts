import { test, expect } from '@playwright/test';
import { ADMIN_PASSWORD, ADMIN_USERNAME } from '../constants';

const TEST_DOMAIN = 'test-example.org';
const TEST_ANSWER = '192.168.1.100';
const UPDATED_DOMAIN = 'updated-example.org';
const UPDATED_ANSWER = '192.168.1.200';

test.describe('DNS Rewrites', () => {
    test.beforeEach(async ({ page }) => {
        console.log('🔐 Logging in...');
        await page.goto('/login.html');
        await page.locator('#username').fill(ADMIN_USERNAME);
        await page.locator('#password').fill(ADMIN_PASSWORD);
        await page.locator('#sign_in').click();
        await page.waitForURL((url) => !url.href.endsWith('/login.html'));
        console.log('✅ Login successful');

        console.log('🔄 Navigating to DNS Rewrites page...');
        await page.goto('/#dns_rewrites');
        await page.waitForTimeout(1000); // Wait for page to load
        console.log('✅ DNS Rewrites page loaded');
    });

    test('should add a new DNS rewrite', async ({ page }) => {
        console.log('📝 Test: Adding new DNS rewrite');

        try {
            // Click add rewrite button
            console.log('  ➡️ Clicking add rewrite button...');
            await page.getByTestId('add-rewrite').click();
            await page.waitForTimeout(500);

            // Fill in the form
            console.log(`  ➡️ Filling domain: ${TEST_DOMAIN}`);
            await page.getByTestId('rewrite-domain-input').fill(TEST_DOMAIN);

            console.log(`  ➡️ Filling answer: ${TEST_ANSWER}`);
            await page.getByTestId('rewrite-answer-input').fill(TEST_ANSWER);

            // Save the rewrite
            console.log('  ➡️ Saving rewrite...');
            await page.getByTestId('rewrite-save-button').click();
            await page.waitForTimeout(1000);

            // Verify the rewrite appears in the table
            console.log('  ➡️ Verifying rewrite in table...');
            const domainCell = page.locator(`text=${TEST_DOMAIN}`);
            const answerCell = page.locator(`text=${TEST_ANSWER}`);

            await expect(domainCell).toBeVisible();
            await expect(answerCell).toBeVisible();

            console.log('✅ Test passed: DNS rewrite added successfully');
        } catch (error) {
            console.error('❌ Test failed: Error adding DNS rewrite', error);
            throw error;
        }
    });

    test('should toggle global rewrite switch in table header', async ({ page }) => {
        console.log('🔘 Test: Toggle global rewrite switch');

        try {
            // Wait for the table to load
            await page.waitForTimeout(1000);

            // Find the global toggle switch
            console.log('  ➡️ Finding global toggle switch...');
            const globalToggle = page.getByTestId('rewrite-global-toggle');
            await expect(globalToggle).toBeVisible();

            // Get initial state
            const initialState = await globalToggle.evaluate((el: HTMLInputElement) => el.checked);
            console.log(`  ➡️ Initial global toggle state: ${initialState}`);

            // Click the toggle
            console.log('  ➡️ Clicking global toggle...');
            await globalToggle.click();
            await page.waitForTimeout(1000);

            // Verify state changed
            const newState = await globalToggle.evaluate((el: HTMLInputElement) => el.checked);
            console.log(`  ➡️ New global toggle state: ${newState}`);
            expect(newState).toBe(!initialState);

            // Toggle back to original state
            console.log('  ➡️ Toggling back to original state...');
            await globalToggle.click();
            await page.waitForTimeout(1000);

            const finalState = await globalToggle.evaluate((el: HTMLInputElement) => el.checked);
            expect(finalState).toBe(initialState);

            console.log('✅ Test passed: Global toggle works correctly');
        } catch (error) {
            console.error('❌ Test failed: Error toggling global switch', error);
            throw error;
        }
    });

    test('should toggle individual rewrite', async ({ page }) => {
        console.log('🔘 Test: Toggle individual rewrite');

        try {
            // Wait for table to load
            await page.waitForTimeout(1000);

            // Find the individual toggle for the test domain
            console.log(`  ➡️ Finding toggle for ${TEST_DOMAIN}...`);
            const individualToggle = page.getByTestId(`rewrite-toggle-${TEST_DOMAIN}`);
            
            // Check if the rewrite exists
            const toggleExists = await individualToggle.count() > 0;
            
            if (!toggleExists) {
                console.log('  ⚠️ Test rewrite not found, skipping test');
                test.skip();
                return;
            }

            await expect(individualToggle).toBeVisible();

            // Get initial state
            const initialState = await individualToggle.evaluate((el: HTMLInputElement) => el.checked);
            console.log(`  ➡️ Initial toggle state: ${initialState}`);

            // Click the toggle
            console.log('  ➡️ Clicking individual toggle...');
            await individualToggle.click();
            await page.waitForTimeout(1000);

            // Verify state changed
            const newState = await individualToggle.evaluate((el: HTMLInputElement) => el.checked);
            console.log(`  ➡️ New toggle state: ${newState}`);
            expect(newState).toBe(!initialState);

            // Toggle back
            console.log('  ➡️ Toggling back to original state...');
            await individualToggle.click();
            await page.waitForTimeout(1000);

            const finalState = await individualToggle.evaluate((el: HTMLInputElement) => el.checked);
            expect(finalState).toBe(initialState);

            console.log('✅ Test passed: Individual toggle works correctly');
        } catch (error) {
            console.error('❌ Test failed: Error toggling individual rewrite', error);
            throw error;
        }
    });

    test('should update rewrite through ConfigureRewritesModal', async ({ page }) => {
        console.log('✏️ Test: Update rewrite through modal');

        try {
            // Wait for table to load
            await page.waitForTimeout(1000);

            // Click edit button for the test domain
            console.log(`  ➡️ Clicking edit button for ${TEST_DOMAIN}...`);
            const editButton = page.getByTestId(`edit-rewrite-${TEST_DOMAIN}`);
            
            const editButtonExists = await editButton.count() > 0;
            
            if (!editButtonExists) {
                console.log('  ⚠️ Test rewrite not found, skipping test');
                test.skip();
                return;
            }

            await editButton.click();
            await page.waitForTimeout(500);

            // Verify modal opened with existing values
            console.log('  ➡️ Verifying modal opened...');
            const domainInput = page.getByTestId('rewrite-domain-input');
            const answerInput = page.getByTestId('rewrite-answer-input');

            await expect(domainInput).toBeVisible();
            await expect(answerInput).toBeVisible();

            const currentDomain = await domainInput.inputValue();
            const currentAnswer = await answerInput.inputValue();
            console.log(`  ➡️ Current values - Domain: ${currentDomain}, Answer: ${currentAnswer}`);

            // Update the values
            console.log(`  ➡️ Updating domain to: ${UPDATED_DOMAIN}`);
            await domainInput.clear();
            await domainInput.fill(UPDATED_DOMAIN);

            console.log(`  ➡️ Updating answer to: ${UPDATED_ANSWER}`);
            await answerInput.clear();
            await answerInput.fill(UPDATED_ANSWER);

            // Save changes
            console.log('  ➡️ Saving changes...');
            await page.getByTestId('rewrite-save-button').click();
            await page.waitForTimeout(1000);

            // Verify updated values appear in table
            console.log('  ➡️ Verifying updated values in table...');
            const updatedDomain = page.locator(`text=${UPDATED_DOMAIN}`);
            const updatedAnswer = page.locator(`text=${UPDATED_ANSWER}`);

            await expect(updatedDomain).toBeVisible();
            await expect(updatedAnswer).toBeVisible();

            console.log('✅ Test passed: Rewrite updated successfully');
        } catch (error) {
            console.error('❌ Test failed: Error updating rewrite', error);
            throw error;
        }
    });

    test('should delete rewrite', async ({ page }) => {
        console.log('🗑️ Test: Delete rewrite');

        try {
            // Wait for table to load
            await page.waitForTimeout(1000);

            // Click delete button for the updated domain
            console.log(`  ➡️ Clicking delete button for ${UPDATED_DOMAIN}...`);
            const deleteButton = page.getByTestId(`delete-rewrite-${UPDATED_DOMAIN}`);
            
            const deleteButtonExists = await deleteButton.count() > 0;
            
            if (!deleteButtonExists) {
                console.log('  ⚠️ Test rewrite not found, trying original domain...');
                const altDeleteButton = page.getByTestId(`delete-rewrite-${TEST_DOMAIN}`);
                const altButtonExists = await altDeleteButton.count() > 0;
                
                if (!altButtonExists) {
                    console.log('  ⚠️ No test rewrite found, skipping test');
                    test.skip();
                    return;
                }
                
                await altDeleteButton.click();
            } else {
                await deleteButton.click();
            }

            await page.waitForTimeout(500);

            // Confirm deletion in the modal
            console.log('  ➡️ Confirming deletion...');
            const confirmButton = page.getByTestId('rewrite-delete-confirm');
            await expect(confirmButton).toBeVisible();
            await confirmButton.click();
            await page.waitForTimeout(1000);

            // Verify the rewrite is no longer in the table
            console.log('  ➡️ Verifying rewrite removed from table...');
            const deletedDomain = page.locator(`text=${UPDATED_DOMAIN}`);
            await expect(deletedDomain).not.toBeVisible();

            console.log('✅ Test passed: Rewrite deleted successfully');
        } catch (error) {
            console.error('❌ Test failed: Error deleting rewrite', error);
            throw error;
        }
    });
});
