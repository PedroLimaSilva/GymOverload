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
    @State private var path: [WorkoutTemplate] = []

    var body: some View {
        NavigationStack(path: $path) {
            List {
                ForEach(templates) { template in
                    NavigationLink(value: template) {
                        VStack(alignment: .leading) {
                            Text(template.name).font(.headline)
                            if !template.plannedExercises.isEmpty {
                                Text("Exercises: \(template.plannedExercises.count)")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
                .onDelete(perform: deleteTemplates)
            }
            .navigationTitle("Workout Templates")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        let newTemplate = WorkoutTemplate(name: "New Template")
                        modelContext.insert(newTemplate)
                        path.append(newTemplate)
                    } label: {
                        Label("New Template", systemImage: "plus")
                    }
                }
            }
            .navigationDestination(for: WorkoutTemplate.self) { template in
                WorkoutTemplateDetailView(template: template)
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
    WorkoutTemplateListView()
        .modelContainer(PreviewData.container)
}
