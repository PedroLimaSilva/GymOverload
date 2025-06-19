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
    @State private var selectedCategories: Set<ExerciseCategory> = []
    @State private var isCategoryFilterPresented = false
    
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
                NavigationStack {
                    List {
                        ForEach(ExerciseCategory.allCases, id: \.self) { category in
                            Toggle(category.rawValue, isOn: Binding(
                                get: { selectedCategories.contains(category) },
                                set: { isSelected in
                                    if isSelected {
                                        selectedCategories.insert(category)
                                    } else {
                                        selectedCategories.remove(category)
                                    }
                                }
                            ))
                        }
                    }
                    .navigationTitle("Filter by Category")
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Done") {
                                isCategoryFilterPresented = false
                            }
                        }
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Clear") {
                                selectedCategories.removeAll()
                                isCategoryFilterPresented = false
                            }
                        }
                    }
                }
            }
            .navigationTitle("Exercises")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        isCategoryFilterPresented = true
                    } label: {
                        Label("Filter", systemImage: "line.3.horizontal.decrease.circle")
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(
                                RoundedRectangle(cornerRadius: 10)
                                    .fill(selectedCategories.isEmpty ? Color(.systemGray5) : Color.accentColor.opacity(0.2))
                            )
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
