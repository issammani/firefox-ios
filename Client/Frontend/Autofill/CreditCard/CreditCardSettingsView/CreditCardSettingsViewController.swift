// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import Common
import UIKit
import Shared
import Storage
import SwiftUI
import WebKit

class CreditCardSettingsViewController: SensitiveViewController, Themeable {
    var viewModel: CreditCardSettingsViewModel
    var themeObserver: NSObjectProtocol?
    var themeManager: ThemeManager
    var notificationCenter: NotificationProtocol
    var settingsWebView: WKWebView!

    private let logger: Logger

    // MARK: Views
    var creditCardEmptyView: UIHostingController<CreditCardSettingsEmptyView>

    var creditCardEditView: CreditCardInputView?
    var creditCardAddEditView: UIHostingController<CreditCardInputView>?

    var creditCardTableViewController: CreditCardTableViewController

    private lazy var addCreditCardButton: UIBarButtonItem = {
        return UIBarButtonItem(image: UIImage.templateImageNamed(StandardImageIdentifiers.Large.plus),
                               style: .plain,
                               target: self,
                               action: #selector(addCreditCard))
    }()

    // MARK: Initializers
    init(creditCardViewModel: CreditCardSettingsViewModel,
         themeManager: ThemeManager = AppContainer.shared.resolve(),
         notificationCenter: NotificationCenter = NotificationCenter.default,
         logger: Logger = DefaultLogger.shared
    ) {
        self.viewModel = creditCardViewModel
        self.themeManager = themeManager
        self.notificationCenter = notificationCenter
        self.logger = logger
        self.creditCardTableViewController = CreditCardTableViewController(viewModel: viewModel.tableViewModel)

        let emptyView = CreditCardSettingsEmptyView(toggleModel: viewModel.toggleModel)
        self.creditCardEmptyView = UIHostingController(rootView: emptyView)
        self.creditCardEmptyView.view.backgroundColor = .clear

        super.init(nibName: nil, bundle: nil)
        self.creditCardTableViewController.didSelectCardAtIndex = {
            [weak self] creditCard in
            self?.viewCreditCard(card: creditCard)
        }
    }

    required init?(coder aDecoder: NSCoder) {
        fatalError("not implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        viewSetup()
        listenForThemeChange(view)
        applyTheme()
    }

    func viewSetup() {
        guard let emptyCreditCardView = creditCardEmptyView.view,
              let creditCardTableView = creditCardTableViewController.view else { return }
        creditCardTableView.translatesAutoresizingMaskIntoConstraints = false
        emptyCreditCardView.translatesAutoresizingMaskIntoConstraints = false

        addChild(creditCardEmptyView)
        addChild(creditCardTableViewController)
        view.addSubview(emptyCreditCardView)
        view.addSubview(creditCardTableView)
        self.title = .SettingsAutofillCreditCard

        NSLayoutConstraint.activate([
            emptyCreditCardView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            emptyCreditCardView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            emptyCreditCardView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            emptyCreditCardView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),

            creditCardTableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            creditCardTableView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            creditCardTableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            creditCardTableView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor)
        ])

        // Hide all the views initially until we update the state
        hideAllViews()

        // Setup state and update view
        updateCreditCardList()


        let guide = view.safeAreaLayoutGuide
        let webConfig = WKWebViewConfiguration()
        webConfig.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        settingsWebView = WKWebView(frame: .zero, configuration: webConfig)
        self.settingsWebView.uiDelegate = self

        if let htmlPath = Bundle.main.path(forResource: "foo", ofType: "html") {
            let url = URL(fileURLWithPath: htmlPath)
            settingsWebView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }


        settingsWebView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(settingsWebView)

        let webViewHeight: CGFloat = 600  // or whatever height you want

        NSLayoutConstraint.activate([
            settingsWebView.leadingAnchor.constraint(equalTo: guide.leadingAnchor),
            settingsWebView.trailingAnchor.constraint(equalTo: guide.trailingAnchor),
            settingsWebView.bottomAnchor.constraint(equalTo: guide.bottomAnchor),
            settingsWebView.heightAnchor.constraint(equalToConstant: webViewHeight)
        ])


        
    }

    private func updateCreditCardList() {
        // Check if we have any credit cards to show in the list
        viewModel.getCreditCardList { creditCards in
            DispatchQueue.main.async { [weak self] in
                let newState = creditCards?.isEmpty ?? true ? CreditCardSettingsState.empty : CreditCardSettingsState.list
                self?.updateState(type: newState)
                self?.notifyWebview(creditCards: creditCards ?? [])
            }
        }
    }

    private func updateState(type: CreditCardSettingsState,
                             creditCard: CreditCard? = nil) {
        switch type {
        case .empty:
            creditCardTableViewController.view.isHidden = true
            creditCardEmptyView.view.isHidden = false
            navigationItem.rightBarButtonItem = addCreditCardButton
        case .add:
            updateStateForEditView(editState: .add)
        case .view:
            updateStateForEditView(editState: .view, creditCard: creditCard)
        case .list:
            creditCardTableViewController.reloadData()
            creditCardEmptyView.view.isHidden = true
            creditCardTableViewController.view.isHidden = false
            navigationItem.rightBarButtonItem = addCreditCardButton
           
        }
    }

    private func notifyWebview(creditCards: [MozillaAppServices.CreditCard]) {
        let jsonData = serializeCreditCardsToJSON(creditCards: creditCards)
        if let jsonData = jsonData {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                self.settingsWebView.evaluateJavaScript("window.postMessage('\(jsonData)', '*');", completionHandler: nil)
            }
        } else {
            print("Failed to serialize data to JSON.")
        }
    }
    
    func creditCardToDictionary(creditCard: MozillaAppServices.CreditCard) -> [String: Any] {
        return ["ccName": creditCard.ccName, "ccLast4": creditCard.ccNumberLast4, "ccExp": "\(creditCard.ccExpMonth)/\(String(creditCard.ccExpYear).suffix(2))","ccType": creditCard.ccType]
    }

    func serializeCreditCardsToJSON(creditCards: [MozillaAppServices.CreditCard]) -> String? {
        let dictionaries = creditCards.map(creditCardToDictionary)
        
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: dictionaries, options: [])
            return String(data: jsonData, encoding: .utf8)
        } catch let error {
            print("Failed to serialize to JSON: \(error.localizedDescription)")
            return nil
        }
    }

    private func hideAllViews() {
        creditCardEmptyView.view.isHidden = true
        creditCardTableViewController.view.isHidden = true
    }

    func applyTheme() {
        let theme = themeManager.currentTheme
        view.backgroundColor = theme.colors.layer1
    }

    deinit {
        notificationCenter.removeObserver(self)
    }

    // MARK: - Private helpers

    private func updateStateForEditView(editState: CreditCardEditState,
                                        creditCard: CreditCard? = nil) {
        // Update credit card edit view state before showing
        if editState == .view {
            viewModel.cardInputViewModel.creditCard = creditCard
        }
        viewModel.cardInputViewModel.updateState(state: editState)
        creditCardEditView = CreditCardInputView(viewModel: viewModel.cardInputViewModel)
        viewModel.cardInputViewModel.dismiss = {
            [weak self] status, successVal in
            DispatchQueue.main.async {
                self?.showToast(status: status)

                if successVal {
                    self?.updateCreditCardList()
                }

                self?.creditCardAddEditView?.dismiss(animated: true)
                self?.viewModel.cardInputViewModel.clearValues()
            }
        }

        guard let creditCardEditView = creditCardEditView else { return }
        creditCardAddEditView = UIHostingController(rootView: creditCardEditView)
        guard let creditCardAddEditView = creditCardAddEditView else { return}
        creditCardAddEditView.view.backgroundColor = .clear
        creditCardAddEditView.modalPresentationStyle = .formSheet
        present(creditCardAddEditView, animated: true, completion: nil)
    }

    private func showToast(status: CreditCardModifiedStatus) {
        guard status != .none else { return }
        SimpleToast().showAlertWithText(status.message,
                                        bottomContainer: view,
                                        theme: themeManager.currentTheme)
    }

    @objc
    private func addCreditCard() {
        updateState(type: .add)
    }

    private func viewCreditCard(card: CreditCard) {
        updateState(type: .view, creditCard: card)
    }
    
}

extension CreditCardSettingsViewController: WKUIDelegate {
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alertController = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alertController.addAction(UIAlertAction(title: "OK", style: .default, handler: { (action) in
            completionHandler()
        }))
        self.present(alertController, animated: true, completion: nil)
    }
}


