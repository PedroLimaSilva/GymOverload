//
//  ContentView.swift
//  GymOverloadWatch Watch App
//
//  Created by Pedro Lima e Silva on 21/06/2025.
//

import SwiftUI
import SwiftData

struct ContentView: View {
    var body: some View {
        NavigationStack {
            WorkoutTemplateList()
        }
    }
}

#Preview {
    ContentView().modelContainer(PreviewData.container)
}
