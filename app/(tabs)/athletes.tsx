import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";

type AthleteProfile = {
  id?: string;
  player_name: string;
  age: number;
  position: string;
  goal: string;
  level: string;
  parent_contact: string;
};

export default function AthletesScreen() {
  const [profiles, setProfiles] = useState<AthleteProfile[]>([]);

  const [playerName, setPlayerName] = useState("");
  const [age, setAge] = useState("");
  const [position, setPosition] = useState("");
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState("");
  const [parentContact, setParentContact] = useState("");

  const loadProfiles = async () => {
    const { data, error } = await supabase
      .from("athlete_profiles")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.log(error.message);
      return;
    }

    setProfiles(data || []);
  };

  useFocusEffect(
    useCallback(() => {
      loadProfiles();
    }, [])
  );

  const saveProfile = async () => {
    if (!playerName.trim()) {
      alert("Enter athlete name");
      return;
    }

    const { error } = await supabase.from("athlete_profiles").insert([
      {
        player_name: playerName.trim(),
        age: Number(age),
        position,
        goal,
        level,
        parent_contact: parentContact,
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Athlete added!");

    setPlayerName("");
    setAge("");
    setPosition("");
    setGoal("");
    setLevel("");
    setParentContact("");

    loadProfiles();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.smallTitle}>ATHLETES</Text>

          <Text style={styles.title}>
            Athlete Profiles
          </Text>

          <Text style={styles.subtitle}>
            Add and manage athlete information for Momentum Engine.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Add Athlete
          </Text>

          <TextInput
            value={playerName}
            onChangeText={setPlayerName}
            placeholder="Athlete Name"
            placeholderTextColor="#64748b"
            style={styles.input}
          />

          <TextInput
            value={age}
            onChangeText={setAge}
            placeholder="Age"
            placeholderTextColor="#64748b"
            keyboardType="number-pad"
            style={styles.input}
          />

          <TextInput
            value={position}
            onChangeText={setPosition}
            placeholder="Position"
            placeholderTextColor="#64748b"
            style={styles.input}
          />

          <TextInput
            value={goal}
            onChangeText={setGoal}
            placeholder="Main Goal"
            placeholderTextColor="#64748b"
            style={styles.input}
          />

          <TextInput
            value={level}
            onChangeText={setLevel}
            placeholder="Level"
            placeholderTextColor="#64748b"
            style={styles.input}
          />

          <TextInput
            value={parentContact}
            onChangeText={setParentContact}
            placeholder="Parent Contact"
            placeholderTextColor="#64748b"
            style={styles.input}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={saveProfile}
          >
            <Text style={styles.buttonText}>
              Save Athlete
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Current Athletes
          </Text>

          {profiles.length === 0 ? (
            <Text style={styles.bodyText}>
              No athletes added yet.
            </Text>
          ) : (
            profiles.map((item, index) => (
              <View
                key={item.id || index}
                style={styles.profileCard}
              >
                <Text style={styles.profileName}>
                  {item.player_name}
                </Text>

                <Text style={styles.bodyText}>
                  Age: {item.age}
                </Text>

                <Text style={styles.bodyText}>
                  Position: {item.position}
                </Text>

                <Text style={styles.bodyText}>
                  Goal: {item.goal}
                </Text>

                <Text style={styles.bodyText}>
                  Level: {item.level}
                </Text>

                <Text style={styles.bodyText}>
                  Parent: {item.parent_contact}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#04111f",
  },

  container: {
    padding: 20,
    paddingBottom: 120,
  },

  heroCard: {
    backgroundColor: "#0b182b",
    borderRadius: 30,
    padding: 24,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#1f3555",
  },

  smallTitle: {
    color: "#2dd4bf",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 10,
  },

  title: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 40,
  },

  subtitle: {
    color: "#9fb0c8",
    fontSize: 16,
    lineHeight: 23,
    marginTop: 10,
  },

  card: {
    backgroundColor: "#0b182b",
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1f3555",
    marginBottom: 18,
  },

  cardTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 16,
  },

  input: {
    backgroundColor: "#061322",
    borderWidth: 1,
    borderColor: "#1f3555",
    borderRadius: 18,
    color: "#ffffff",
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },

  button: {
    backgroundColor: "#2dd4bf",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },

  buttonText: {
    color: "#03111d",
    fontSize: 16,
    fontWeight: "900",
  },

  profileCard: {
    backgroundColor: "#061322",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f3555",
    marginBottom: 12,
  },

  profileName: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },

  bodyText: {
    color: "#dbeafe",
    fontSize: 15,
    lineHeight: 23,
  },
});