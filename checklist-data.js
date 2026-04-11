// Données de la liste de check-out
// Pour ajouter une photo : photos: ["photos/mon-image.jpg"]
// Pour ajouter une note  : note: "Texte explicatif affiché en dépliable"
// Les items avec photo(s) ou note affichent un bouton ▼ pour déplier le détail

// ---- Checklist d'ARRIVÉE ----
const ARRIVAL_DATA = [
  {
    id: "arr1",
    title: "Eau",
    items: [
      { id: "a1i1", text: "Localiser le robinet d'arrivée d'eau générale (sous le mobile home ou au niveau du compteur)", photos: [] },
      { id: "a1i2", text: "Ouvrir le robinet d'arrivée d'eau générale", photos: [] },
      { id: "a1i3", text: "Vérifier qu'il n'y a pas de fuite visible sous l'évier ou dans la salle de bain", photos: [] },
      { id: "a1i4", text: "Laisser couler l'eau quelques secondes pour purger les tuyaux", photos: [] }
    ]
  },
  {
    id: "arr2",
    title: "Gaz",
    items: [
      { id: "a2i1", text: "Récupérer la petite clé du trousseau du mobile home", photos: [] },
      { id: "a2i2", text: "Ouvrir le cadenas du coffre à bouteilles (derrière le mobile home)", photos: [] },
      { id: "a2i3", text: "Ouvrir les 2 bouteilles de gaz à fond (sens horaire)", photos: [] },
      { id: "a2i4", text: "Vérifier que la bouteille raccordée est bien ouverte", photos: [] }
    ]
  },
  {
    id: "arr3",
    title: "Extérieur",
    items: [
      { id: "a3i1", text: "Sortir et installer le parasol", photos: [] },
      { id: "a3i2", text: "Sortir les combinaisons et les planches", photos: [] }
    ]
  },
  {
    id: "arr4",
    title: "Électricité",
    items: [
      { id: "a4i1", text: "Enclencher le disjoncteur général (dans les toilettes)", photos: [] },
      { id: "a4i2", text: "Vérifier que la porte du frigo est bien fermée", photos: [] },
      { id: "a4i3", text: "Allumer les appareils nécessaires", photos: [] }
    ]
  },
  {
    id: "arr5",
    title: "Chauffe-eau",
    items: [
      { id: "a5i1", text: "⚠️ Ne pas toucher aux boutons du chauffe-eau", photos: [] },
      { id: "a5i2", text: "Attendre que l'eau chauffe (cela prend du temps, c'est normal)", photos: [] },
      { id: "a5i3", text: "Si l'eau devient trop chaude puis froide → remettre à zéro et recommencer", photos: [] }
    ]
  }
];

// ---- Checklist de DÉPART ----
const CHECKLIST_DATA = [
  {
    id: "sec0",
    title: "Cuisine et alimentation",
    items: [
      { id: "s0i1", text: "Vider les restes alimentaires périssables", photos: [] },
      { id: "s0i2", text: "Vider et nettoyer le réfrigérateur", photos: [] },
      { id: "s0i3", text: "Fermer et ranger huiles, épices et condiments", photos: [] },
      { id: "s0i4", text: "Vérifier qu'il ne reste pas de nourriture ouverte", photos: [] }
    ]
  },
  {
    id: "sec1",
    title: "Nettoyage intérieur",
    items: [
      { id: "s1i1", text: "Faire la vaisselle et tout ranger", photos: [] },
      { id: "s1i2", text: "Nettoyer les plans de travail et l'évier", photos: [] },
      { id: "s1i3", text: "Nettoyer les plaques de cuisson", photos: [] },
      { id: "s1i4", text: "Vider et nettoyer le réfrigérateur", photos: [] },
      { id: "s1i5", text: "Vider les poubelles et sortir les sacs", photos: [] },
      { id: "s1i6", text: "Passer le balai ou l'aspirateur", photos: [] },
      { id: "s1i7", text: "Nettoyer la salle de bain et les toilettes", photos: [] },
      { id: "s1i8", text: "Changer ou laver les draps et serviettes", photos: [] }
    ]
  },
  {
    id: "sec2",
    title: "Sécurité et fermeture",
    items: [
      { id: "s2i1", text: "Fermer et verrouiller toutes les fenêtres", photos: [] },
      { id: "s2i2", text: "Fermer et verrouiller la porte d'entrée", photos: [] },
      { id: "s2i3", text: "Vérifier que les volets sont fermés", photos: [] },
      { id: "s2i4", text: "Éteindre la climatisation", photos: [] },
      { id: "s2i5", text: "Débrancher tous les appareils électriques", photos: [] },
      { id: "s2i6", text: "⚠️ Ne pas toucher aux boutons du chauffe-eau", photos: [] }
    ]
  },
  {
    id: "sec3",
    title: "Équipements extérieurs",
    items: [
      { id: "s3i1", text: "Ranger les chaises et la table de jardin", photos: [] },
      { id: "s3i2", text: "Mettre la table et le vélo sous la bâche", photos: [] },
      { id: "s3i3", text: "Ranger les jeux et jouets de plage", photos: [] }
    ]
  },
  {
    id: "sec4",
    title: "Eau",
    items: [
      { id: "s4i1", text: "Vérifier que tous les robinets sont fermés", photos: [] },
      { id: "s4i2", text: "Couper l'arrivée d'eau générale", photos: [] }
    ]
  },
  {
    id: "sec5",
    title: "Gaz",
    items: [
      { id: "s5i1", text: "Fermer les 2 bouteilles de gaz et tourner les robinets en position fermée", photos: [] },
      { id: "s5i2", text: "Verrouiller le coffre à bouteilles (petite clé du trousseau du mobile home)", photos: [] }
    ]
  },
  {
    id: "sec6",
    title: "Électricité",
    items: [
      { id: "s6i1", text: "Couper le disjoncteur général (dans les toilettes)", photos: [] }
    ]
  },
];
