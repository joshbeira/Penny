import SwiftUI
import UIKit

struct PracticeView: View {
    @EnvironmentObject private var model: PennyModel
    @State private var confirming: PracticeAction?
    @State private var mode = "Overview"
    private let overview = "Sample account. Balance one thousand four hundred and twenty pounds, fifty pence. Comfortable. Two sample bills this week, eighty-four pounds."
    private let week = "Sample week. Monday, groceries, thirty-two pounds forty out. Tuesday, pension, two hundred and thirty pounds in. Wednesday, unfamiliar merchant, seventy-nine pounds out. Review this unusual sample payment."

    var body: some View {
        PennyPage {
            Eyebrow(text: "Practice with confidence")
            Text("A space to explore.").font(.largeTitle.bold())
            Text("Synthetic accounts. No bank connection. No real money, payments or card orders.").foregroundStyle(PennyTheme.amber).accessibilityIdentifier("simulation-notice")
            Text("Presentation").font(.headline)
            Picker("Presentation", selection: $mode) {
                Text("Overview").tag("Overview")
                Text("Detail").tag("Detail")
                Text("Listen").tag("Listen")
            }.pickerStyle(.menu).accessibilityIdentifier("practice-presentation")
            Text("Different ways to present the same information, not a simulation of anyone’s sight.").font(.footnote).foregroundStyle(PennyTheme.muted)
            PennyCard {
                if mode == "Listen" {
                    Label("Listen at your pace", systemImage: "speaker.wave.2").font(.title2.bold())
                    Text("Choose an audio control below. These are the same words you will hear.").foregroundStyle(PennyTheme.muted)
                    Text(overview)
                    Text(week).foregroundStyle(PennyTheme.muted)
                } else {
                    Text("Sample current account").font(.headline)
                    Text("£1,420.50").font(.largeTitle.bold()).minimumScaleFactor(0.7)
                    Text("Comfortable").font(.title2.bold()).foregroundStyle(PennyTheme.amber)
                    Text("Two sample bills this week · £84.00").foregroundStyle(PennyTheme.muted)
                    if mode == "Detail" {
                        Text("Monday · Groceries · −£32.40\nTuesday · Pension · +£230.00\nWednesday · Unfamiliar merchant · −£79.00").lineSpacing(8)
                    }
                }
                Button("Play the Glance") {
                    UIImpactFeedbackGenerator(style: .soft).impactOccurred()
                    model.readAloud(overview)
                }.buttonStyle(PennyButtonStyle(primary: true))
                Button("Read my sample week") { model.readAloud(week) }.buttonStyle(PennyButtonStyle())
                Button("Play my week as sounds") {
                    model.stopAudio()
                    do { try model.sounds.play(); model.message = "Sample sounds: one tone for groceries out, rising tones for pension in, then a lower review cue for the unusual payment." }
                    catch { model.message = "Sound is unavailable. Sample week: groceries out, pension in, unusual payment for review." }
                }.buttonStyle(PennyButtonStyle())
                Button("Stop audio") { model.stopAudio() }.buttonStyle(PennyButtonStyle())
            }
            PennyCard {
                Text("Unusual sample payment").font(.title2.bold())
                Text("Unfamiliar merchant · £79.00\nReview before confirming a practice action.").foregroundStyle(PennyTheme.muted)
                Button("Practise flagging a payment") { confirming = .flag }.buttonStyle(PennyButtonStyle()).accessibilityIdentifier("practice-flag")
            }
            Button("Practise ordering a replacement card") { confirming = .card }.buttonStyle(PennyButtonStyle())
            NavigationLink(value: PennyRoute.receipts) { Text("Inspect action receipts (\(model.archive.receipts.count))") }.buttonStyle(PennyButtonStyle())
        }
        .navigationTitle("Banking sandbox").navigationBarTitleDisplayMode(.inline)
        .sheet(item: $confirming) { action in
            NavigationStack {
                PennyPage {
                    Eyebrow(text: "Review before you confirm")
                    Text(action.title).font(.title.bold())
                    Text(action.details).font(.title3)
                    Text("This adds a local practice receipt. No real financial action occurs.").foregroundStyle(PennyTheme.muted)
                    Button("Read confirmation aloud") { model.readAloud(action.details) }.buttonStyle(PennyButtonStyle())
                    Button("Confirm practice action") {
                        model.stopAudio()
                        Task { await model.confirm(action); confirming = nil }
                    }.buttonStyle(PennyButtonStyle(primary: true)).disabled(model.busy || model.storageUnavailable || !model.loaded)
                    Button("Cancel") { model.stopAudio(); confirming = nil }.buttonStyle(PennyButtonStyle())
                }
                .navigationTitle("Confirm practice")
            }
            .presentationDetents([.large])
            .modifier(PrivacyShield())
        }
        .onDisappear {
            // Tab changes already stop outgoing audio. Do not cancel speech just
            // started in the reader by a voice command during that transition.
            if model.tab == .home || model.tab == .settings {
                model.stopAudio()
            }
        }
    }
}

struct ReceiptsView: View {
    @EnvironmentObject private var model: PennyModel
    @State private var deleting = false
    var body: some View {
        PennyPage {
            Eyebrow(text: "Transparent practice actions")
            Text("\(Receipt.verify(model.archive.receipts) ? "Chain verified" : "Verification failed") · \(model.archive.receipts.count) \(model.archive.receipts.count == 1 ? "receipt" : "receipts")")
                .font(.title2.bold()).accessibilityIdentifier("receipt-verification")
            Text("Confirmed practice actions link to the previous receipt with SHA-256. This detects inconsistent edits, not a complete rewrite of local history.").foregroundStyle(PennyTheme.muted)
            if model.archive.receipts.isEmpty {
                Text("Confirm a practice action in the banking sandbox to create your first receipt.")
            }
            ForEach(model.archive.receipts.reversed()) { receipt in
                PennyCard {
                    Text(receipt.action).font(.headline)
                    Text(receipt.details)
                    Text(receipt.ts).font(.footnote).foregroundStyle(PennyTheme.muted)
                    Text("SHA-256\n\(receipt.hash)").font(.caption.monospaced()).textSelection(.enabled).foregroundStyle(PennyTheme.muted)
                }
            }
            if !model.archive.receipts.isEmpty {
                Button("Export receipts") { model.exportReceipts() }.buttonStyle(PennyButtonStyle())
                Button("Delete all receipts", role: .destructive) { deleting = true }.frame(minHeight: 44).disabled(model.busy)
            }
        }
        .navigationTitle("Action receipts").navigationBarTitleDisplayMode(.inline)
        .confirmationDialog("Delete all practice receipts?", isPresented: $deleting, titleVisibility: .visible) {
            Button("Delete receipts", role: .destructive) { Task { await model.deleteReceipts() } }
        }
    }
}
