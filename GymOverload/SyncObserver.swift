//
//  SyncObserver.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 21/06/2025.
//


import Foundation
import SwiftData
import Combine
import WatchConnectivity

@Observable
final class SyncObserver {
    private var context: ModelContext
    private var cancellables = Set<AnyCancellable>()
    
    init(context: ModelContext) {
        self.context = context
        _ = WatchSyncManager.shared
        startObserving()
    }
    
    private func startObserving() {
        // Poll SwiftData with a timer or use Combine (if using @Published)
        Timer
            .publish(every: 10, on: .main, in: .common) // You can adjust frequency
            .autoconnect()
            .sink { [weak self] _ in
                do {
                    let exercises = try self?.context.fetch(FetchDescriptor<Exercise>()) ?? []
                    let templates = try self?.context.fetch(FetchDescriptor<WorkoutTemplate>()) ?? []
                    self?.sendDataIfNeeded(exercises: exercises, templates: templates)
                } catch {
                    print("❌ Sync fetch failed: \(error)")
                }
            }
            .store(in: &cancellables)
    }
    
    func sendDataIfNeeded(exercises: [Exercise], templates: [WorkoutTemplate]) {
        let session = WCSession.default

        guard session.activationState == .activated else {
            print("⚠️ WCSession not ready — activationState: \(session.activationState.rawValue)")
            return
        }

        guard session.isPaired && session.isWatchAppInstalled else {
            print("⚠️ Watch is not paired or app not installed.")
            return
        }

        print("💬 Sending data to watch...")

        let encoder = JSONEncoder()
        do {
            let exerciseData = try encoder.encode(exercises.map { ExerciseDTO(from: $0) })
            let templateData = try encoder.encode(templates.map { WorkoutTemplateDTO(from: $0) })

            let payload: [String: Any] = [
                "exercises": exerciseData,
                "templates": templateData
            ]

            session.transferUserInfo(payload)
        } catch {
            print("❌ Failed to encode data: \(error)")
        }
    }
}
