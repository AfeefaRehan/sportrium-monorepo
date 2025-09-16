"""add team verify/reject + ticketing tables

Revision ID: 20250914200730
Revises: 7a9fffab70f6
Create Date: 2025-09-14T20:07:30.445189

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250914200730'
down_revision = '7a9fffab70f6'
branch_labels = None
depends_on = None

def upgrade():
    # team verify/reject columns
    with op.batch_alter_table('teams') as batch_op:
        try:
            batch_op.add_column(sa.Column('verified_at', sa.DateTime(), nullable=True))
        except Exception:
            pass
        try:
            batch_op.add_column(sa.Column('rejected_at', sa.DateTime(), nullable=True))
        except Exception:
            pass
    # ticket types
    op.create_table('ticket_types',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('event_id', sa.String(length=36), nullable=False, index=True),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('price_cents', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='GBP'),
        sa.Column('capacity', sa.Integer(), nullable=True),
        sa.Column('sold', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    # ticket purchases
    op.create_table('ticket_purchases',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('event_id', sa.String(length=36), nullable=False, index=True),
        sa.Column('ticket_type_id', sa.String(length=36), nullable=True),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('total_cents', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='GBP'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )

def downgrade():
    op.drop_table('ticket_purchases')
    op.drop_table('ticket_types')
    with op.batch_alter_table('teams') as batch_op:
        try:
            batch_op.drop_column('rejected_at')
        except Exception:
            pass
        try:
            batch_op.drop_column('verified_at')
        except Exception:
            pass
