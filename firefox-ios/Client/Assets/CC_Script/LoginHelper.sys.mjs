import { Logic } from "./LoginManager.shared.mjs";

export const LoginHelper = {
  // Copied and adapted from: https://searchfox.org/mozilla-central/source/toolkit/components/passwordmgr/LoginHelper.sys.mjs#676
  getLoginOrigin(uriString, allowJS = false) {
    try {
      const mozProxyRegex = /^moz-proxy:\/\//i;
      const isMozProxy = !!uriString.match(mozProxyRegex);

      if (isMozProxy) {
        // Special handling for moz-proxy:// by replacing it with https://
        const url = new URL(uriString.replace(mozProxyRegex, "https://"));
        return "moz-proxy://" + url.host;
      }

      const uri = new URL(uriString);

      if (allowJS && uri.protocol === "javascript:") {
        return "javascript:";
      }

      // Build the origin manually to exclude userPass portion
      return uri.protocol + "//" + uri.host;
    } catch {
      return null;
    }
  },
  // Copied as is from: https://searchfox.org/mozilla-central/source/toolkit/components/passwordmgr/LoginHelper.sys.mjs#701
  getFormActionOrigin(form) {
    let uriString = form.action;

    // A blank or missing action submits to where it came from.
    if (uriString == "") {
      // ala bug 297761
      uriString = form.baseURI;
    }

    return this.getLoginOrigin(uriString, true);
  },
  // Copied as is from: https://searchfox.org/mozilla-central/source/toolkit/components/passwordmgr/LoginHelper.sys.mjs#1334
  isUsernameFieldType(element, { ignoreConnect = false } = {}) {
    if (!HTMLInputElement.isInstance(element)) {
      return false;
    }

    if (!element.isConnected && !ignoreConnect) {
      // If the element isn't connected then it isn't visible to the user so
      // shouldn't be considered. It must have been connected in the past.
      return false;
    }

    if (element.hasBeenTypePassword) {
      return false;
    }

    if (!Logic.inputTypeIsCompatibleWithUsername(element)) {
      return false;
    }

    let acFieldName = element.getAutocompleteInfo().fieldName;
    if (
      !(
        acFieldName == "username" ||
        acFieldName == "webauthn" ||
        // Bug 1540154: Some sites use tel/email on their username fields.
        acFieldName == "email" ||
        acFieldName == "tel" ||
        acFieldName == "tel-national" ||
        acFieldName == "off" ||
        acFieldName == "on" ||
        acFieldName == ""
      )
    ) {
      return false;
    }
    return true;
  },
  // Copied as is from: https://searchfox.org/mozilla-central/source/toolkit/components/passwordmgr/LoginHelper.sys.mjs#1296

  isPasswordFieldType(element, { ignoreConnect = false } = {}) {
    if (!HTMLInputElement.isInstance(element)) {
      return false;
    }

    if (!element.isConnected && !ignoreConnect) {
      // If the element isn't connected then it isn't visible to the user so
      // shouldn't be considered. It must have been connected in the past.
      return false;
    }

    if (!element.hasBeenTypePassword) {
      return false;
    }

    // Ensure the element is of a type that could have autocomplete.
    // These include the types with user-editable values. If not, even if it used to be
    // a type=password, we can't treat it as a password input now
    let acInfo = element.getAutocompleteInfo();
    if (!acInfo) {
      return false;
    }

    return true;
  },
};
