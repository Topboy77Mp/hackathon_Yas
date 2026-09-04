"""Modèles SQLModel — conformes au <contrat_partage> du prompt de conception.

Machines à états volontairement minimales (D4). GroupMember n'a pas de colonne
quantity : la quantité vit dans Order et nulle part ailleurs (D2).
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum

from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UserRole(str, Enum):
    USER = "USER"
    MERCHANT = "MERCHANT"
    ADMIN = "ADMIN"


class ProductStatus(str, Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"


class GroupStatus(str, Enum):
    OPEN = "OPEN"
    LOCKED = "LOCKED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class OrderStatus(str, Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"


class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    first_name: str
    last_name: str
    phone: str = Field(unique=True, index=True)
    email: str | None = Field(default=None)
    password_hash: str
    role: UserRole = Field(default=UserRole.USER)
    created_at: datetime = Field(default_factory=utcnow)


class Merchant(SQLModel, table=True):
    __tablename__ = "merchants"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    business_name: str
    description: str | None = Field(default=None)
    location: str | None = Field(default=None)
    status: str = Field(default="ACTIVE")
    created_at: datetime = Field(default_factory=utcnow)


class Product(SQLModel, table=True):
    __tablename__ = "products"

    id: int | None = Field(default=None, primary_key=True)
    merchant_id: int = Field(foreign_key="merchants.id", index=True)
    name: str
    description: str | None = Field(default=None)
    unit_label: str = Field(default="unité")
    image_url: str | None = Field(default=None)
    stock: int = Field(default=0)
    individual_price: int
    status: ProductStatus = Field(default=ProductStatus.ACTIVE)
    created_at: datetime = Field(default_factory=utcnow)


class PriceTier(SQLModel, table=True):
    __tablename__ = "price_tiers"

    id: int | None = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="products.id", index=True)
    min_quantity: int
    max_quantity: int | None = Field(default=None)
    unit_price: int


class Group(SQLModel, table=True):
    __tablename__ = "groups"

    id: int | None = Field(default=None, primary_key=True)
    creator_id: int = Field(foreign_key="users.id", index=True)
    product_id: int = Field(foreign_key="products.id", index=True)
    name: str
    target_quantity: int
    min_quantity: int
    deadline: datetime
    status: GroupStatus = Field(default=GroupStatus.OPEN)
    share_code: str = Field(unique=True, index=True)
    created_at: datetime = Field(default_factory=utcnow)


class GroupMember(SQLModel, table=True):
    __tablename__ = "group_members"

    id: int | None = Field(default=None, primary_key=True)
    group_id: int = Field(foreign_key="groups.id", index=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    joined_at: datetime = Field(default_factory=utcnow)


class Order(SQLModel, table=True):
    __tablename__ = "orders"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    group_id: int = Field(foreign_key="groups.id", index=True)
    product_id: int = Field(foreign_key="products.id", index=True)
    quantity: int
    unit_price: int
    total_amount: int
    payment_status: PaymentStatus = Field(default=PaymentStatus.PENDING)
    order_status: OrderStatus = Field(default=OrderStatus.PENDING)
    created_at: datetime = Field(default_factory=utcnow)


class Payment(SQLModel, table=True):
    __tablename__ = "payments"

    id: int | None = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="orders.id", index=True)
    amount: int
    method: str = Field(default="MOCK")
    status: PaymentStatus = Field(default=PaymentStatus.PENDING)
    transaction_reference: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=utcnow)


class Notification(SQLModel, table=True):
    __tablename__ = "notifications"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    type: str
    title: str
    message: str
    read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=utcnow)
