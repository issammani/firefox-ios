// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import Foundation
import WebKit
import XCTest

final class WKUserScriptExtensionsTests: XCTestCase {

  let scriptSource = "window.scriptEvaluated = true;"
  let secureURL = URLRequest(url: URL(string: "https://example.com")!)
  let insecureURL = URLRequest(url: URL(string: "http://example.com")!)

  var defaultContentScript: WKUserScript!
  var secureDefaultContentScript: WKUserScript!
  var pageScript: WKUserScript!
  var securePageScript: WKUserScript!

  override func setUp() {
    super.setUp()
    defaultContentScript = WKUserScript.createInDefaultContentWorld(
      source: scriptSource, injectionTime: .atDocumentStart, forMainFrameOnly: true)
    secureDefaultContentScript = WKUserScript.createInDefaultContentWorld(
      source: scriptSource, injectionTime: .atDocumentStart, forMainFrameOnly: true,
      forSecureContextOnly: true)
    pageScript = WKUserScript.createInPageContentWorld(
      source: scriptSource, injectionTime: .atDocumentStart, forMainFrameOnly: true)
    securePageScript = WKUserScript.createInPageContentWorld(
      source: scriptSource, injectionTime: .atDocumentStart, forMainFrameOnly: true,
      forSecureContextOnly: true)
  }

  override func tearDown() {
    defaultContentScript = nil
    secureDefaultContentScript = nil
    pageScript = nil
    securePageScript = nil
    super.tearDown()
  }

  func test_secureContext_securePageScript() {
    let testHelper = WKWebViewTestHelper(script: securePageScript, url: secureURL, testCase: self)

    let result = testHelper.evaluateJavaScript("window.scriptEvaluated", in: .page)
    XCTAssertEqual(result as? Bool, true)
  }

  func test_secureContext_insecurePageScript() {
    let testHelper = WKWebViewTestHelper(script: pageScript, url: secureURL, testCase: self)

    let result = testHelper.evaluateJavaScript("window.scriptEvaluated", in: .page)
    XCTAssertEqual(result as? Bool, true)
  }

  func test_secureContext_secureDefaultContentScript() {
    let testHelper = WKWebViewTestHelper(
      script: secureDefaultContentScript, url: secureURL, testCase: self)

    let result = testHelper.evaluateJavaScript("window.scriptEvaluated", in: .defaultClient)
    XCTAssertEqual(result as? Bool, true)
  }

  func test_secureContext_insecureDefaultContentScript() {
    let testHelper = WKWebViewTestHelper(
      script: defaultContentScript, url: secureURL, testCase: self)

    let result = testHelper.evaluateJavaScript("window.scriptEvaluated", in: .defaultClient)
    XCTAssertEqual(result as? Bool, true)
  }

  func test_insecureContext_securePageScript() {
    let testHelper = WKWebViewTestHelper(script: securePageScript, url: insecureURL, testCase: self)

    let result = testHelper.evaluateJavaScript("window.scriptEvaluated", in: .page)
    XCTAssertNil(result as? Bool)
  }

  func test_insecureContext_insecurePageScript() {
    let testHelper = WKWebViewTestHelper(script: pageScript, url: insecureURL, testCase: self)

    let result = testHelper.evaluateJavaScript("window.scriptEvaluated", in: .page)
    XCTAssertEqual(result as? Bool, true)
  }

  func test_insecureContext_secureDefaultContentScript() {
    let testHelper = WKWebViewTestHelper(
      script: secureDefaultContentScript, url: insecureURL, testCase: self)

    let result = testHelper.evaluateJavaScript("window.scriptEvaluated", in: .defaultClient)
    XCTAssertNil(result as? Bool)
  }

  func test_insecureContext_insecureDefaultContentScript() {
    let testHelper = WKWebViewTestHelper(
      script: defaultContentScript, url: insecureURL, testCase: self)

    let result = testHelper.evaluateJavaScript("window.scriptEvaluated", in: .defaultClient)
    XCTAssertEqual(result as? Bool, true)
  }

}

class WKWebViewTestHelper: NSObject, WKNavigationDelegate {
  let timeout: TimeInterval = 20
  var webView: WKWebView!
  var script: WKUserScript!
  var testCase: XCTestCase
  var loadExpectation: XCTestExpectation?

  init(script: WKUserScript, url: URLRequest, testCase: XCTestCase) {
    self.script = script
    self.testCase = testCase
    super.init()
    self.setupWebview(url)
  }

  func setupWebview(_ url: URLRequest) {
    let configuration = WKWebViewConfiguration()
    configuration.userContentController.addUserScript(script)
    webView = WKWebView(frame: .zero, configuration: configuration)
    webView.navigationDelegate = self
    loadExpectation = testCase.expectation(description: "WebView Loaded")
    webView.load(url)
    testCase.waitForExpectations(timeout: timeout)
  }

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    loadExpectation?.fulfill()
  }

  func evaluateJavaScript(_ script: String, in contentWorld: WKContentWorld) -> Any? {
    var result: Any?
    let jsExpectation = testCase.expectation(description: "JavaScript Evaluated")

    DispatchQueue.main.async {
      self.webView.evaluateJavaScript(script, in: nil, in: contentWorld) { res in
        switch res {
        case .success(let value):
          result = value
        case .failure(let error):
          XCTFail("Failed to evaluate Javascript \(error)")
        }
        jsExpectation.fulfill()
      }
    }

    testCase.waitForExpectations(timeout: timeout)
    return result
  }
}
