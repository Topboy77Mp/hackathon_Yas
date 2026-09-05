/**
 * Onboarding — vu une seule fois, à la première ouverture.
 *
 * Stocké dans AsyncStorage plutôt qu'en mémoire : réafficher l'introduction à
 * chaque relance serait perçu comme un défaut, pas comme un accueil.
 *
 * L'état est observable, et ce n'est pas un raffinement : une première version
 * se contentait d'une lecture au montage. Après « Commencer », le layout racine
 * voyait toujours « non vu » et redirigeait aussitôt vers l'introduction —
 * l'utilisateur restait enfermé dans une boucle dont il ne pouvait pas sortir.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CLE = 'kashflow.onboarding.vu';

type Abonne = (vu: boolean) => void;

let etat: boolean | null = null;
const abonnes = new Set<Abonne>();

async function lire(): Promise<boolean> {
  if (etat !== null) return etat;
  try {
    etat = (await AsyncStorage.getItem(CLE)) === '1';
  } catch {
    // Un stockage indisponible ne doit pas enfermer l'utilisateur dehors :
    // on considère l'introduction comme vue et on laisse passer.
    etat = true;
  }
  return etat;
}

export async function marquerOnboardingVu(): Promise<void> {
  etat = true;
  try {
    await AsyncStorage.setItem(CLE, '1');
  } catch {
    // La session en cours reste correcte même si l'écriture échoue.
  }
  for (const abonne of abonnes) abonne(true);
}

export function useOnboarding() {
  const [vu, setVu] = useState<boolean | null>(etat);

  useEffect(() => {
    let monte = true;
    void lire().then((v) => monte && setVu(v));

    const abonne: Abonne = (v) => monte && setVu(v);
    abonnes.add(abonne);
    return () => {
      monte = false;
      abonnes.delete(abonne);
    };
  }, []);

  return { onboardingVu: vu, enCoursDeLecture: vu === null };
}
