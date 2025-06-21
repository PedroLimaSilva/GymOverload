//
//  WatchSyncManager.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 21/06/2025.
//


import WatchConnectivity
import SwiftData

class WatchSyncManager: NSObject, WCSessionDelegate {
    
    private var isSessionActivated = false
    
    func sessionDidBecomeInactive(_ session: WCSession) { }
    
    func sessionDidDeactivate(_ session: WCSession) { }
    
    static let shared = WatchSyncManager()
    
    private override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            print("✅ Activating WC Session")
            WCSession.default.activate()
        }
    }
    
    func sendDataIfNeeded(exercises: [Exercise], templates: [WorkoutTemplate]) {
        guard isSessionActivated else {
            print("⚠️ WCSession not ready yet")
            return
        }
        guard WCSession.default.isPaired,
              WCSession.default.isWatchAppInstalled else { return }
        
        print("✅ Watch app is installed, paired and session is active")
        
        do {
            let exerciseDTOs = exercises.map { ExerciseDTO(from: $0) }
            let exerciseData = try JSONEncoder().encode(exerciseDTOs)
            let templateDTOs = templates.map { WorkoutTemplateDTO(from: $0) }
            let templateData = try JSONEncoder().encode(templateDTOs)
            
            let payload: [String: Any] = [
                "exercises": exerciseData,
                "templates": templateData
            ]
            
            WCSession.default.transferUserInfo(payload)
        } catch {
            print("Encoding failed: \(error)")
        }
    }
    
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        isSessionActivated = (activationState == .activated)
        print("✅ WCSession activated with state: \(activationState.rawValue)")
    }
}
