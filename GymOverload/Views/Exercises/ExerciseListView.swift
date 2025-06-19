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
    
    var onSelect: ((Exercise) -> Void)? = nil
    var onSelectMultiple: (([Exercise]) -> Void)? = nil
    @State private var selectedExercises: Set<Exercise> = []
    
    private var filteredExercises: [Exercise] {
        exercises.filter { exercise in
            let matchesSearch = searchText.isEmpty || exercise.name.localizedCaseInsensitiveContains(searchText)
            let matchesCategory = selectedCategories.isEmpty || !Set(exercise.categories).isDisjoint(with: selectedCategories)
            return matchesSearch && matchesCategory
        }
        .sorted { $0.createdAt > $1.createdAt }
    }
    
    @Environment(\.modelContext) private var modelContext

    @State private var path: [Exercise] = []

    var body: some View {
        NavigationStack(path: $path) {
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
                    ForEach(filteredExercises) { exercise in
                        if let onSelect {
                            Button {
                                onSelect(exercise)
                            } label: {
                                ExerciseRow(exercise: exercise)
                            }
                        } else if onSelectMultiple != nil {
                            Button {
                                if selectedExercises.contains(exercise) {
                                    selectedExercises.remove(exercise)
                                } else {
                                    selectedExercises.insert(exercise)
                                }
                            } label: {
                                HStack {
                                    ExerciseRow(exercise: exercise)
                                    Spacer()
                                    if selectedExercises.contains(exercise) {
                                        Image(systemName: "checkmark")
                                            .foregroundColor(.accentColor)
                                    }
                                }
                            }
                        } else {
                            NavigationLink(value: exercise) {
                                ExerciseRow(exercise: exercise)
                            }
                        }
                    }
                    .onDelete(perform: deleteExercises)
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
            .navigationTitle("Exercises")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        let newExercise = Exercise(
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
                        modelContext.insert(newExercise)
                        path.append(newExercise)
                    } label: {
                        Label("New Exercise", systemImage: "plus")
                    }
                }
                
                if onSelectMultiple != nil {
                    ToolbarItem(placement: .bottomBar) {
                        Button("Add \(selectedExercises.count) Exercises") {
                            onSelectMultiple?(Array(selectedExercises))
                        }
                        .disabled(selectedExercises.isEmpty)
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
            .navigationDestination(for: Exercise.self) { exercise in
                ExerciseDetailView(exercise: exercise)
            }
        }
    }
    
    private func deleteExercises(at offsets: IndexSet) {
        for index in offsets {
            let exercise = filteredExercises[index]
            modelContext.delete(exercise)
        }
    }
}

#Preview {
    ExerciseListView()
        .modelContainer(PreviewData.container)
}
