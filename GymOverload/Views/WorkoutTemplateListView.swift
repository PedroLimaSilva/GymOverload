//
//  WorkoutTemplateListView.swift
//  GymOverload
//  Created by AI Assistant on 19/06/2025.
//

import SwiftUI
import SwiftData

struct WorkoutTemplateListView: View {
    @Query private var templates: [WorkoutTemplate]
    @Environment(\.modelContext) private var modelContext
    @State private var showingEditor = false
    @State private var templateToEdit: WorkoutTemplate? = nil

    var body: some View {
        NavigationStack {
            List {
                ForEach(templates) { template in
                    VStack(alignment: .leading) {
                        Text(template.name).font(.headline)
                        if !template.plannedExercises.isEmpty {
                            Text("Exercises: \(template.plannedExercises.count)")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                    .contentShape(Rectangle())
                    .onTapGesture {
                        templateToEdit = template
                        showingEditor = true
                    }
                }
                .onDelete(perform: deleteTemplates)
            }
            .navigationTitle("Workout Templates")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        templateToEdit = nil
                        showingEditor = true
                    } label: {
                        Label("New Template", systemImage: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingEditor) {
                Text("Editing workout")
            }
        }
    }
    private func deleteTemplates(at offsets: IndexSet) {
        for index in offsets {
            let template = templates[index]
            modelContext.delete(template)
        }
    }
}

#Preview {
    WorkoutTemplateListView().modelContainer(PreviewData.container)
}
