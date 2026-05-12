import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
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
  access_code?: string;
  status?: string;
};

function generateAccessCode(name: string) {
  const cleanName = name.trim().replace(/\s+/g, "").toUpperCase();
  const shortName = cleanName.slice(0, 6) || "ATHLETE";
  const year = new Date().getFullYear();
  return `${shortName}${year}`;
}

export default function AthletesScreen() {
  const [profiles, setProfiles] = useState<AthleteProfile[]>([]);

  const [playerName, setPlayerName] = useState("");
  const [age, setAge] = useState("");
  const [position, setPosition] = useState("");
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState("");
  const [parentContact, setParentContact] = useState("");
  const [accessCode, setAccessCode] = useState("");

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
      Alert.alert("Missing Name", "Enter athlete name.");
      return;
    }

    const finalAccessCode =
      accessCode.trim().toUpperCase() || generateAccessCode(playerName);

    const { error } = await supabase.from("athlete_profiles").insert([
      {
        player_name: playerName.trim(),
        age: Number(age) || 0,
        position: position.trim(),
        goal: goal.trim(),
        level: level.trim(),
        parent_contact: parentContact.trim(),
        access_code: finalAccessCode,
        status: "active",
      },
    ]);

    if (error) {
      Alert.alert("Save Failed", error.message);
      return;
    }

    Alert.alert(
      "Athlete Added",
      `${playerName.trim()} was added successfully.`
    );

    setPlayerName("");
    setAge("");
    setPosition("");
    setGoal("");
    setLevel("");
    setParentContact("");
    setAccessCode("");

    loadProfiles();
  };

  const deleteAthlete = async (id?: string) => {
    if (!id) return;

    Alert.alert(
      "Delete Athlete",
      "Are you sure you want to remove this athlete?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("athlete_profiles")
              .delete()
              .eq("id", id);

            if (error) {
              Alert.alert("Delete Failed", error.message);
              return;
            }

            loadProfiles();
          },
        },
      ]
    );
  };

  const clearAllAthletes = async () => {
    Alert.alert(
      "Clear All Athletes",
      "This will remove every athlete from your athlete tab. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("athlete_profiles")
              .delete()
              .not("id", "is", null);

            if (error) {
              Alert.alert("Clear Failed", error.message);
              return;
            }

            setProfiles([]);
            Alert.alert("Cleared", "All athletes cleared.");
          },
        },
      ]
    );
  };

  const deactivateAthlete = async (id?: string, currentStatus?: string) => {
    if (!id) return;

    const nextStatus = currentStatus === "inactive" ? "active" : "inactive";

    const { error } = await supabase
      .from("athlete_profiles")
      .update({ status: nextStatus })
      .eq("id", id);

    if (error) {
      Alert.alert("Update Failed", error.message);
      return;
    }

    loadProfiles();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.smallTitle}>ATHLETES</Text>

          <Text style={styles.title}>Athlete Manager</Text>

          <Text style={styles.subtitle}>
            Add athletes, create access codes, and manage who can use Momentum
            Engine.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Athlete</Text>

          <TextInput
            value={playerName}
            onChangeText={(text) => {
              setPlayerName(text);
              if (!accessCode.trim()) {
                setAccessCode(generateAccessCode(text));
              }
            }}
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

          <TextInput
            value={accessCode}
            onChangeText={(text) => setAccessCode(text.toUpperCase())}
            placeholder="Access Code"
            placeholderTextColor="#64748b"
            autoCapitalize="characters"
            style={styles.input}
          />

          <TouchableOpacity style={styles.button} onPress={saveProfile}>
            <Text style={styles.buttonText}>Save Athlete</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Current Athletes</Text>

            {profiles.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearAllAthletes}
              >
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {profiles.length === 0 ? (
            <Text style={styles.bodyText}>No athletes added yet.</Text>
          ) : (
            profiles.map((item, index) => (
              <View key={item.id || index} style={styles.profileCard}>
                <View style={styles.profileTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profileName}>{item.player_name}</Text>
                    <Text style={styles.statusText}>
                      Status: {item.status || "active"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      item.status === "inactive" && styles.statusBadgeInactive,
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>
                      {item.status === "inactive" ? "Inactive" : "Active"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.bodyText}>Age: {item.age}</Text>
                <Text style={styles.bodyText}>Position: {item.position}</Text>
                <Text style={styles.bodyText}>Goal: {item.goal}</Text>
                <Text style={styles.bodyText}>Level: {item.level}</Text>
                <Text style={styles.bodyText}>
                  Parent: {item.parent_contact}
                </Text>

                <View style={styles.hiddenCodeBox}>
                  <Text style={styles.hiddenCodeText}>
                    Access code hidden for security
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => deactivateAthlete(item.id, item.status)}
                >
                  <Text style={styles.secondaryButtonText}>
                    {item.status === "inactive"
                      ? "Reactivate Athlete"
                      : "Deactivate Athlete"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteAthlete(item.id)}
                >
                  <Text style={styles.deleteButtonText}>Remove Athlete</Text>
                </TouchableOpacity>
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

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  cardTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
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

  clearButton: {
    backgroundColor: "#7f1d1d",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  clearButtonText: {
    color: "#ffffff",
    fontSize: 13,
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

  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  profileName: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4,
  },

  statusText: {
    color: "#9fb0c8",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },

  statusBadge: {
    backgroundColor: "#14532d",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 10,
  },

  statusBadgeInactive: {
    backgroundColor: "#7f1d1d",
  },

  statusBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
  },

  bodyText: {
    color: "#dbeafe",
    fontSize: 15,
    lineHeight: 23,
  },

  hiddenCodeBox: {
    backgroundColor: "#0b182b",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 14,
    marginTop: 14,
    marginBottom: 12,
  },

  hiddenCodeText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "800",
    fontStyle: "italic",
  },

  secondaryButton: {
    backgroundColor: "#1e3a8a",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6,
  },

  secondaryButtonText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 14,
  },

  deleteButton: {
    backgroundColor: "#7f1d1d",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },

  deleteButtonText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 14,
  },
});