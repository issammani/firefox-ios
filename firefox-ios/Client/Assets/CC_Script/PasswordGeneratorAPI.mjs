import "resource://gre/modules/shared/Helpers.ios.mjs";
import { NewPasswordModel } from "resource://gre/modules/NewPasswordModel.sys.mjs";
import { LoginFormFactory } from "resource://gre/modules/LoginFormFactory.sys.mjs";
import { LoginHelper } from "resource://gre/modules/LoginHelper.sys.mjs";

// Copied and adapted from: https://searchfox.org/mozilla-central/source/toolkit/components/passwordmgr/LoginManagerChild.sys.mjs#3278
export const isProbablyANewPasswordField = (inputElement) => {
  const acInfo = inputElement.getAttribute("autocomplete");
  if (acInfo === "new-password") {
    return true;
  }
  const threshold = 0.75;
  if (threshold == -1) {
    // Fathom is disabled
    return false;
  }
  const { rules, type } = NewPasswordModel;
  const results = rules.against(inputElement);
  const score = results.get(inputElement).scoreFor(type);
  return score >= threshold;
};

// Copied and adapted from: https://searchfox.org/mozilla-central/source/toolkit/components/passwordmgr/LoginManagerChild.sys.mjs#956-1022
export const fillConfirmFieldWithGeneratedPassword = (passwordField) => {
  // Fill a nearby password input if it looks like a confirm-password field
  let form = LoginFormFactory.createFromField(passwordField);
  let confirmPasswordInput = null;
  // The confirm-password field shouldn't be more than 3 form elements away from the password field we filled
  let MAX_CONFIRM_PASSWORD_DISTANCE = 3;

  let startIndex = form.elements.indexOf(passwordField);
  if (startIndex == -1) {
    throw new Error("Password field is not in the form's elements collection");
  }

  //     // TODO(Needed)
  //   // If we've already filled another field with a generated password,
  //   // this might be the confirm-password field, so don't try and find another
  //   let previousGeneratedPasswordField = form.elements.some(
  //     (inp) => inp !== passwordField && this.generatedPasswordFields.has(inp)
  //   );
  //   if (previousGeneratedPasswordField) {
  //     return;
  //   }

  // Get a list of input fields to search in.
  // Pre-filter type=hidden fields; they don't count against the distance threshold
  let afterFields = form.elements
    .slice(startIndex + 1)
    .filter((elem) => elem.type !== "hidden");

  let acFieldName = passwordField.getAutocompleteInfo()?.fieldName;

  // Match same autocomplete values first
  if (acFieldName == "new-password") {
    let matchIndex = afterFields.findIndex(
      (elem) =>
        LoginHelper.isPasswordFieldType(elem) &&
        elem.getAutocompleteInfo().fieldName == acFieldName &&
        !elem.disabled &&
        !elem.readOnly
    );
    if (matchIndex >= 0 && matchIndex < MAX_CONFIRM_PASSWORD_DISTANCE) {
      confirmPasswordInput = afterFields[matchIndex];
    }
  }
  if (!confirmPasswordInput) {
    for (
      let idx = 0;
      idx < Math.min(MAX_CONFIRM_PASSWORD_DISTANCE, afterFields.length);
      idx++
    ) {
      if (
        LoginHelper.isPasswordFieldType(afterFields[idx]) &&
        !afterFields[idx].disabled &&
        !afterFields[idx].readOnly
      ) {
        confirmPasswordInput = afterFields[idx];
        break;
      }
    }
  }
  if (confirmPasswordInput && !confirmPasswordInput.value) {
    // this._treatAsGeneratedPasswordField(confirmPasswordInput);
    confirmPasswordInput.setUserInput(passwordField.value);
    // LoginFormState._highlightFilledField(confirmPasswordInput);
  }
};

export { PasswordGenerator } from "resource://gre/modules/PasswordGenerator.sys.mjs";
