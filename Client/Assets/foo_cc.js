import { repeat, html, LitElement, css, map, range } from "./foo_lit.js";

const cardImgMap = {
  VISA: "vcard.png",
  MASTERCARD: "mcard.png",
};

class App extends LitElement {
  static styles = css`
    div {
      width: 100%;
      height: 100%;
    }

    .credentials {
      background: white;
      padding: 8px 0px;
    }

    p {
      color: #64646d;
      font-family: sans-serif;
      font-size: 12px;
      margin-left: 16px;
    }

    .separator {
      display: block;
      background: rgba(0, 0, 0, 0.05);
      height: 2px;
      margin: 16px 4px;
    }
  `;

  static properties = {
    credentials: { type: Array, reflect: true },
  };

  constructor() {
    super();

    this.credentials = [];

    window.addEventListener("message", ({ data }) => {
      this.credentials = JSON.parse(data);
    });
  }

  render() {
    return html`
      <div>
        <p>SAVED CARDS</p>
        <div class="credentials">
          ${repeat(
            this.credentials,
            (credential) => credential.id,
            (credential, i) =>
              html`<x-credential-card
                  .credential=${credential}
                ></x-credential-card>
                ${i !== this.credentials.length - 1
                  ? html`<span class="separator"></span>`
                  : ""} `
          )}
        </div>
      </div>
    `;
  }
}

class CredentialCard extends LitElement {
  static styles = css`
    :host {
      width: 100%;
    }

    .card {
      display: grid;
      grid-template-columns: 72px 1fr;
      gap: 12px;
    }

    .img-container {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    img {
      width: 56px;
      height: auto;
    }

    .credential-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .gray {
      color: #6b6b74;
    }

    p {
      margin: 0;
      padding: 0;
      color: #1f1e22;
    }
    .uppercase {
      text-transform: uppercase;
    }

    .dot {
      display: inline-block;
      width: 4px; /* adjust as needed */
      height: 4px;
      background-color: #6b6b74;
      border-radius: 50%;
      margin: 0 2px; /* adjust as needed */
      vertical-align: middle; /* to center it with other text */
    }
  `;

  static properties = {
    credential: { type: Object, reflect: true },
  };

  get icon() {
    const cardType =
      this.credential.ccType in cardImgMap ? this.credential.ccType : "visa";
    return cardImgMap[cardType];
  }

  ccNumberTemplate() {
    return html` <span class="gray">
      ${map(range(4), () => html`<span class="dot"></span>`)}
      ${this.credential.ccLast4}
    </span>`;
  }

  render() {
    return html`
      <div class="card">
        <div class="img-container">
          <img src="${this.icon}" />
        </div>
        <div class="credential-container">
          <p class="name">${this.credential.ccName}</p>
          <p class="uppercase">
            ${this.credential.ccType} ${this.ccNumberTemplate()}
          </p>
          <p class="gray">Expires ${this.credential.ccExp}</p>
        </div>
      </div>
    `;
  }
}

customElements.define("x-credential-card", CredentialCard);
customElements.define("x-app", App);
