// Données de la liste de check-out
// Pour ajouter une photo : copier le fichier dans photos/ et ajouter le chemin ici
// Exemple : photos: ["photos/fenetre-salon.jpg", "photos/fenetre-chambre.jpg"]

const CHECKLIST_DATA = [
  {
    id: "sec1",
    title: "🔒 Sécurité et fermeture",
    items: [
      { id: "s1i1", text: "Fermer et verrouiller toutes les fenêtres", photos: [] },
      { id: "s1i2", text: "Fermer et verrouiller la porte d'entrée", photos: [] },
      { id: "s1i3", text: "Vérifier que les volets sont fermés", photos: [] },
      { id: "s1i4", text: "Éteindre et fermer la bouteille de gaz", photos: [] },
      { id: "s1i5", text: "Débrancher tous les appareils électriques", photos: [] },
      { id: "s1i6", text: "Éteindre le chauffe-eau", photos: [] }
    ]
  },
  {
    id: "sec2",
    title: "🧹 Nettoyage intérieur",
    items: [
      { id: "s2i1", text: "Faire la vaisselle et tout ranger", photos: [] },
      { id: "s2i2", text: "Nettoyer les plans de travail et l'évier", photos: [] },
      { id: "s2i3", text: "Nettoyer les plaques de cuisson", photos: [] },
      { id: "s2i4", text: "Vider et nettoyer le réfrigérateur", photos: [] },
      { id: "s2i5", text: "Vider les poubelles et sortir les sacs", photos: [] },
      { id: "s2i6", text: "Passer le balai ou l'aspirateur", photos: [] },
      { id: "s2i7", text: "Nettoyer la salle de bain et les toilettes", photos: [] },
      { id: "s2i8", text: "Changer ou laver les draps et serviettes", photos: [] }
    ]
  },
  {
    id: "sec3",
    title: "🌊 Équipements extérieurs",
    items: [
      { id: "s3i1", text: "Ranger les chaises et la table de jardin", photos: [] },
      { id: "s3i2", text: "Rentrer ou attacher le parasol", photos: [] },
      { id: "s3i3", text: "Ranger les jeux et jouets de plage", photos: [] },
      { id: "s3i4", text: "Rincer et ranger les combinaisons et planches", photos: [] }
    ]
  },
  {
    id: "sec4",
    title: "❄️ Cuisine et alimentation",
    items: [
      { id: "s4i1", text: "Vider les restes alimentaires périssables", photos: [] },
      { id: "s4i2", text: "Vider et débrancher le réfrigérateur si absence longue", photos: [] },
      { id: "s4i3", text: "Fermer et ranger huiles, épices et condiments", photos: [] },
      { id: "s4i4", text: "Vérifier qu'il ne reste pas de nourriture ouverte", photos: [] }
    ]
  },
  {
    id: "sec5",
    title: "💧 Eau et énergie",
    items: [
      { id: "s5i1", text: "Couper l'arrivée d'eau générale", photos: [] },
      { id: "s5i2", text: "Vérifier que tous les robinets sont fermés", photos: [] },
      { id: "s5i3", text: "Éteindre le tableau électrique si départ prolongé", photos: [] }
    ]
  },
  {
    id: "sec6",
    title: "📋 Dernières vérifications",
    items: [
      { id: "s6i1", text: "Prendre tous les effets personnels (médicaments, chargeurs…)", photos: [] },
      { id: "s6i2", text: "Vérifier que les clés sont bien avec vous", photos: [] },
      { id: "s6i3", text: "Photographier l'état général avant de partir (optionnel)", photos: [] }
    ]
  }
];
