const { test, expect } = require("@playwright/test");
const { getFileUrl, getTestAssets } = require("./test-utils");

const mockData = {
  "credit-card": {
    "cc-number": "4242424242424242",
    "cc-name": "John Doe",
    "cc-exp-month": "12",
    "cc-exp-year": "2024",
    "cc-type": "visa",
  },
  address: {
    "street-address": "Sesame Street Building 123 Apt 4",
    "address-level2": "Utopia",
    "address-level1": "GU",
    "postal-code": "44848",
    name: "Kevin Bacon",
    organization: "Acme",
    country: "US",
    tel: "55895895895",
    email: "fjfhfj@jjjf.com",
    "given-name": "Kevin",
    "family-name": "Bacon",
  },
  messageHandlers: {
    "credit-card": "creditCardFormMessageHandler",
    address: "addressFormMessageHandler",
  },
};

async function interceptAutofillMessages(page) {
  await page.exposeFunction("webkitInterceptor", async (message) => {
    await page.evaluate((message) => {
      window.messages.push(message);
    }, message);
  });

  await page.evaluate(() => {
    window.messages = [];
  });

  for (const frame of await page.frames()) {
    await frame.addScriptTag({ url: getFileUrl("WebkitMessageHandler.js") });
    await frame.addScriptTag({
      url: getFileUrl("AutofillAllFramesAtDocumentStart.js"),
    });
  }
}

test.describe("Form autofill and capture", () => {
  getTestAssets().forEach(({ name, path }) => {
    test(`Test form fill and capture on ${name}`, async ({ page }) => {
      page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

      await page.goto(getFileUrl(path));
      await interceptAutofillMessages(page);
      const foundFields = [];

      for (const frame of await page.frames()) {
        const inputs = await frame.$$("input");

        for (const input of inputs) {
          await input.focus();
          const triggeredAutofill = await page.evaluate(() =>
            window.messages.shift()
          );
          await input.evaluate((e) => e.blur()); // There is no .blur() method for some reason
          if (triggeredAutofill) {
            foundFields.push({ frame, input });
            break;
          }
        }
      }

      // Clear all messages received so far
      await page.evaluate(() => {
        window.messages = [];
      });

      for (const { frame, input } of foundFields) {
        await input.focus();

        const interceptedFillData = await page.evaluate(() =>
          window.messages.shift()
        );
        const formType = interceptedFillData.name.startsWith("creditCard")
          ? "credit-card"
          : "address";

        const expectedKeys = Object.keys(mockData[formType]);
        const formFields = Object.keys(interceptedFillData.data.payload);

        // Check if correct message handler was used
        expect(interceptedFillData.name).toEqual(
          mockData.messageHandlers[formType]
        );
        // Check if payload sent back to swift has the correct type
        expect(interceptedFillData.data.type).toEqual(`fill-${formType}-form`);
        // Check if payload sent back to swift has all expected keys
        expect(expectedKeys).toEqual(expect.arrayContaining(formFields));

        // Fill data in form
        await frame.evaluate((payload) => {
          __firefox__.FormAutofillHelper.fillFormFields(payload);
        }, mockData[formType]);

        // Submit form
        // NOTE: We will always mark the button to click with name="submit"
        await frame.evaluate(async () => {
          const submit = document.querySelector("[name*='submit']");
          document.addEventListener("submit", (e) => e.preventDefault());
          submit.click();
        });

        const interceptedCaptureData = await page.evaluate(() =>
          window.messages.shift()
        );
        const expectedPayload = mockData[formType];

        // Check if correct message handler was used
        expect(interceptedCaptureData.name).toEqual(
          mockData.messageHandlers[formType]
        );
        // Check if payload sent back to swift has the correct type
        expect(interceptedCaptureData.data.type).toEqual(
          `capture-${formType}-form`
        );
        // Check if payload sent back to swift has all expected keys
        expect(interceptedCaptureData.data.payload).toEqual(expectedPayload);
      }
    });
  });
});
