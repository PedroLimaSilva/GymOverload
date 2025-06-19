//
//  ExerciseListView.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 19/06/2025.
//

import SwiftUI
import SwiftData

struct ExerciseListView: View {
    @Query private var exercises: [Exercise]
    @State private var searchText = ""
    @State private var selectedCategories: [ExerciseCategory] = []
    @State private var isCategoryFilterPresented = false

    @Environment(\.modelContext) private var modelContext
    @State private var draftExercise: Exercise? = nil

    var body: some View {
        NavigationStack {
            List {
                if !selectedCategories.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            ForEach(Array(selectedCategories), id: \.self) { category in
                                Text(category.rawValue)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 6)
                                    .background(Color.accentColor.opacity(0.1))
                                    .foregroundColor(.accentColor)
                                    .clipShape(Capsule())
                            }
                        }
                        .padding(.horizontal)
                    }
                }

                Group {
                    ForEach(exercises.filter { exercise in
                        let matchesSearch = searchText.isEmpty || exercise.name.localizedCaseInsensitiveContains(searchText)
                        let matchesCategory = selectedCategories.isEmpty || !Set(exercise.categories).isDisjoint(with: selectedCategories)
                        return matchesSearch && matchesCategory
                    }) { exercise in
                        NavigationLink {
                            ExerciseDetailView(exercise: exercise)
                        } label: {
                            VStack(alignment: .leading) {
                                Text(exercise.name).font(.headline)
                                Text(exercise.categories.map(\.rawValue).joined(separator: ", "))
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                            .transition(.move(edge: .leading).combined(with: .opacity))
                        }
                    }
                }
            }
            .animation(.default, value: searchText)
            .animation(.default, value: selectedCategories)
            .searchable(text: $searchText, prompt: "Search Exercises")
            .sheet(isPresented: $isCategoryFilterPresented) {
                MultiCategoryPicker(title: "Filter by Category", showClear: true, selectedCategories: Binding(
                    get: { selectedCategories },
                    set: { selectedCategories = $0 }
                ))
            }
            .sheet(item: $draftExercise) { exercise in
                NavigationStack {
                    ExerciseDetailView(exercise: exercise)
                        .toolbar {
                            ToolbarItem(placement: .confirmationAction) {
                                Button {
                                    modelContext.insert(exercise)
                                    draftExercise = nil
                                } label: {
                                    Label("Done", systemImage:"checkmark")
                                }
                            }
                            ToolbarItem(placement: .cancellationAction) {
                                Button {
                                    draftExercise = nil
                                } label: {
                                    Label("Clear", systemImage:"trash")
                                }
                            }
                        }
                }
            }
            .navigationTitle("Exercises")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        draftExercise = Exercise(
                            name: "New Exercise",
                            categories: [],
                            defaultRestSeconds: 60,
                            weightIncrementKg: 2.5,
                            weightIncrementLb: 5,
                            weightUnit: "kg",
                            kind: "Weight, Reps",
                            doubleWeightForVolume: false,
                            notes: nil
                        )
                    } label: {
                        Label("New Exercise", systemImage: "plus")
                    }
                }

                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        isCategoryFilterPresented = true
                    } label: {
                        Label("Filter", systemImage: "line.3.horizontal.decrease")
                    }
                }
            }
        }
    }
}

#Preview {
    ExerciseListView()
        .modelContainer(PreviewData.container)
}
