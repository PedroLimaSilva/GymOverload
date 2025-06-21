//
//  WatchDataReceiver.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 21/06/2025.
//

import WatchConnectivity
import SwiftData
internal import Combine

extension ModelContext {
    static var placeholder: ModelContext {
        do {
            let emptySchema = Schema([])
            let container = try ModelContainer(for: emptySchema)
            return ModelContext(container)
        } catch {
            fatalError("Failed to create placeholder ModelContext: \(error)")
        }
    }
}

class WatchDataReceiver: NSObject, WCSessionDelegate, ObservableObject {
    @Published var exercises: [Exercise] = []
    @Published var templates: [WorkoutTemplate] = []

    private(set) var context: ModelContext
    private var hasSetContext = false

    var contextIsPlaceholder: Bool {
        !hasSetContext
    }

    init(context: ModelContext) {
        self.context = context
        super.init()

        if WCSession.isSupported() {
            WCSession.default.delegate = self
            print("✅ Activating WC Session")
            WCSession.default.activate()
        }
    }

    func setContext(_ newContext: ModelContext) {
        self.context = newContext
        self.hasSetContext = true
    }
    
    func replaceContextData(with exercises: [Exercise], templates: [WorkoutTemplate]) async {
        // Delete existing data
        let allExercises = try? context.fetch(FetchDescriptor<Exercise>())
        let allTemplates = try? context.fetch(FetchDescriptor<WorkoutTemplate>())

        allExercises?.forEach { context.delete($0) }
        allTemplates?.forEach { context.delete($0) }

        // Insert synced data
        exercises.forEach { context.insert($0) }
        templates.forEach { context.insert($0) }

        try? context.save()
    }
    
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String : Any]) {
        print("💬 Received message from iOS")
        let decoder = JSONDecoder()

        if let exerciseData = userInfo["exercises"] as? Data,
           let templateData = userInfo["templates"] as? Data {
            do {
                let exerciseDTOs = try decoder.decode([ExerciseDTO].self, from: exerciseData)
                let templateDTOs = try decoder.decode([WorkoutTemplateDTO].self, from: templateData)

                let exerciseModels = exerciseDTOs.map { $0.toModel() }
                let templateModels = templateDTOs.map { $0.toModel() }

                print("💬 Read data from iOS: ", exerciseModels, templateModels)
                DispatchQueue.main.async {
                    Task {
                        await self.replaceContextData(with: exerciseModels, templates: templateModels)
                        #if DEBUG
                        let storedTemplates = try? self.context.fetch(FetchDescriptor<WorkoutTemplate>())
                            print("📦 Stored templates count: \(storedTemplates?.count ?? 0)")
                        #endif
                        
                        // Optional: update @Published if UI needs it directly
                        self.exercises = exerciseModels
                        self.templates = templateModels
                    }
                }
            } catch {
                print("❌ Decoding failed: \(error)")
            }
        }
    }
}
