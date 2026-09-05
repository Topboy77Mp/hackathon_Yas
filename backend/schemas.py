"""Schémas de réponse — reflet exact du <contrat_partage>.

Toute divergence entre ces modèles et le contrat est un incident à signaler dans
docs/handoff/contract-changes.md, jamais une correction silencieuse.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from models import GroupStatus, OrderStatus, PaymentStatus, ProductStatus, UserRole


class TierOut(BaseModel):
    min_quantity: int
    unit_price: int


class ProductTierOut(TierOut):
    """Palier vu depuis la fiche produit, avec sa borne haute.

    `TierOut` reste volontairement à deux champs : c'est la forme gelée de
    `current_tier` et `next_tier` dans GroupDetail. La fiche produit, elle, doit
    afficher des intervalles (« 1–49 »), ce qui demande `max_quantity`.
    """

    max_quantity: int | None = None


class GroupProductOut(BaseModel):
    id: int
    name: str
    unit_label: str
    image_url: str | None
    individual_price: int
    merchant_name: str


class MembershipOut(BaseModel):
    joined: bool
    order_id: int
    quantity: int
    total_amount: int


class GroupDetail(BaseModel):
    id: int
    name: str
    share_code: str
    status: GroupStatus
    deadline: datetime
    seconds_remaining: int

    product: GroupProductOut

    participants_count: int
    current_quantity: int
    target_quantity: int
    min_quantity: int

    current_unit_price: int
    current_tier: TierOut
    next_tier: TierOut | None
    quantity_to_next_tier: int | None
    progress_ratio: float

    #: Grille complète du produit, ajoutée après arbitrage humain. Le contrat
    #: fige une liste de champs sans `tiers[]` tout en exigeant, dans le même
    #: paragraphe, que le payload soit auto-suffisant — « l'écran groupe se
    #: dessine intégralement à partir de lui, sans second appel ». Les deux ne
    #: pouvaient pas être vrais : l'écran n'affichait que 2 paliers sur 4.
    #: `current_tier` et `next_tier` gardent leur forme gelée à deux champs.
    tiers: list[ProductTierOut] = Field(default_factory=list)

    unit_saving: int
    potential_unit_saving: int
    group_total_saving: int

    my_membership: MembershipOut | None


class ErrorOut(BaseModel):
    """Réponse d'erreur uniforme : le front ne devine pas."""

    detail: str
    code: str


# ── Authentification ───────────────────────────────────────────────

class RegisterIn(BaseModel):
    first_name: str = Field(min_length=1, max_length=60)
    last_name: str = Field(min_length=1, max_length=60)
    phone: str = Field(min_length=6, max_length=20)
    password: str = Field(min_length=6, max_length=128)
    email: str | None = None

    #: Renseigné = le compte est créé avec le rôle MERCHANT et sa boutique.
    #: Absent = simple acheteur. Un seul endpoint pour les deux parcours : le
    #: contrat n'en prévoit pas d'autre, et en ajouter un dupliquerait la
    #: validation du téléphone et le hachage du mot de passe.
    business_name: str | None = Field(default=None, min_length=2, max_length=120)
    business_location: str | None = Field(default=None, max_length=120)
    business_description: str | None = Field(default=None, max_length=400)


class LoginIn(BaseModel):
    phone: str
    password: str


class ForgotPasswordIn(BaseModel):
    phone: str = Field(min_length=6, max_length=20)


class ForgotPasswordOut(BaseModel):
    """Réponse volontairement identique, que le numéro existe ou non.

    Distinguer les deux cas transformerait l'endpoint en annuaire : on saurait
    quels numéros sont inscrits sur KashFlow simplement en les essayant.
    """

    sent: bool
    #: Renseigné uniquement quand un jeton de démonstration valide accompagne la
    #: requête. Aucune passerelle SMS n'est au périmètre du contrat ; plutôt que
    #: de simuler un envoi, on assume le canal de démonstration.
    demo_code: str | None = None


class ResetPasswordIn(BaseModel):
    phone: str = Field(min_length=6, max_length=20)
    code: str = Field(min_length=4, max_length=12)
    new_password: str = Field(min_length=6, max_length=128)


class ChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=6, max_length=128)


class PreferencesOut(BaseModel):
    notifications_enabled: bool
    default_share_register: str


class PreferencesIn(BaseModel):
    """Champs omis = inchangés. Un PATCH partiel, pas un remplacement."""

    notifications_enabled: bool | None = None
    default_share_register: str | None = Field(default=None, max_length=30)


class UserOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    phone: str
    email: str | None
    role: UserRole


class AuthOut(BaseModel):
    token: str
    user: UserOut


# ── Catalogue ──────────────────────────────────────────────────────

class ProductCard(BaseModel):
    id: int
    name: str
    unit_label: str
    image_url: str | None
    individual_price: int
    #: Meilleur prix atteignable si le dernier palier est débloqué. Une promesse.
    best_price: int
    merchant_name: str
    open_groups_count: int
    #: Prix réellement en vigueur dans le groupe ouvert le moins cher, ou `None`
    #: s'il n'y en a aucun. `best_price` est une promesse, celui-ci est un fait :
    #: le catalogue ne doit pas afficher une remise que personne n'a encore
    #: débloquée.
    best_open_group_price: int | None = None


class GroupCard(BaseModel):
    id: int
    name: str
    share_code: str
    status: GroupStatus
    participants_count: int
    current_quantity: int
    target_quantity: int
    current_unit_price: int
    progress_ratio: float
    seconds_remaining: int


class ProductDetail(BaseModel):
    id: int
    name: str
    description: str | None
    unit_label: str
    image_url: str | None
    stock: int
    individual_price: int
    merchant_name: str
    merchant_location: str | None
    tiers: list[ProductTierOut]
    open_groups: list[GroupCard]


# ── Groupes et commandes ───────────────────────────────────────────

class GroupCreateIn(BaseModel):
    product_id: int
    name: str = Field(min_length=1, max_length=80)
    target_quantity: int = Field(ge=1)
    min_quantity: int = Field(ge=1)
    deadline_hours: int = Field(default=48, ge=1, le=720)
    quantity: int = Field(default=1, ge=1)


class JoinIn(BaseModel):
    quantity: int = Field(ge=1)


class OrderOut(BaseModel):
    id: int
    group_id: int
    group_name: str
    product_id: int
    product_name: str
    unit_label: str
    quantity: int
    unit_price: int
    total_amount: int
    individual_price: int
    saving: int
    payment_status: PaymentStatus
    order_status: OrderStatus
    created_at: datetime


class JoinOut(BaseModel):
    order: OrderOut
    group: GroupDetail
    tier_unlocked: bool
    previous_unit_price: int


class PaymentOut(BaseModel):
    id: int
    order_id: int
    amount: int
    method: str
    status: PaymentStatus
    transaction_reference: str | None


class PayOut(BaseModel):
    payment: PaymentOut
    order: OrderOut


# ── Commerçant et impact ───────────────────────────────────────────

class MerchantGroupRow(BaseModel):
    group_id: int
    group_name: str
    product_name: str
    participants_count: int
    current_quantity: int
    target_quantity: int
    current_unit_price: int
    total_amount: int
    status: GroupStatus


class MerchantDashboard(BaseModel):
    business_name: str
    orders: int
    groups: int
    units: int
    revenue_simule: int
    pending_orders: int
    rows: list[MerchantGroupRow]


class MerchantProductRow(BaseModel):
    """Une offre vue par son commerçant, grille comprise.

    Le catalogue public (`ProductCard`) masque les brouillons et n'expose pas le
    stock : le commerçant, lui, doit voir ses deux.
    """

    id: int
    name: str
    unit_label: str
    image_url: str | None
    stock: int
    individual_price: int
    best_price: int
    status: ProductStatus
    tiers: list[TierOut]
    groups_count: int
    reserved_units: int


class MerchantProductsOut(BaseModel):
    products: list[MerchantProductRow]


class NotificationOut(BaseModel):
    id: int
    type: str
    title: str
    message: str
    read: bool
    created_at: datetime


class NotificationsOut(BaseModel):
    unread_count: int
    notifications: list[NotificationOut]


class TierIn(BaseModel):
    min_quantity: int = Field(ge=1)
    max_quantity: int | None = None
    unit_price: int = Field(ge=1)


class ProductCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = None
    unit_label: str = Field(default="unité", max_length=20)
    image_url: str | None = None
    stock: int = Field(ge=1)
    individual_price: int = Field(ge=1)
    tiers: list[TierIn] | None = None


class TiersIn(BaseModel):
    tiers: list[TierIn] = Field(min_length=1)


# ── Assistants IA ──────────────────────────────────────────────────────────

class SuggestTiersIn(BaseModel):
    product_name: str = Field(min_length=1, max_length=120)
    retail_price: int = Field(ge=1)
    stock: int = Field(ge=1)
    floor_price: int | None = Field(default=None, ge=1)


class TierSuggestion(BaseModel):
    min_quantity: int
    max_quantity: int | None
    unit_price: int
    justification: str


class SuggestTiersOut(BaseModel):
    tiers: list[TierSuggestion]
    source: str  # "ia" ou "repli" — jamais affiché tel quel à l'utilisateur


class ShareMessageIn(BaseModel):
    group_id: int


class ShareVariant(BaseModel):
    registre: str
    texte: str


class ShareMessageOut(BaseModel):
    share_url: str
    variants: list[ShareVariant]
    source: str


class DiscoverIn(BaseModel):
    query: str = Field(min_length=2, max_length=120)
    product_id: int | None = None


class GroupSuggestion(BaseModel):
    score: float
    reason: str
    group: GroupCard


class DiscoverOut(BaseModel):
    query: str
    suggestions: list[GroupSuggestion]
    source: str


class ImpactStats(BaseModel):
    users: int
    merchants: int
    products: int
    groups_created: int
    groups_active: int
    groups_successful: int
    success_rate: float
    orders: int
    units_ordered: int
    total_order_value: int
    community_savings: int
