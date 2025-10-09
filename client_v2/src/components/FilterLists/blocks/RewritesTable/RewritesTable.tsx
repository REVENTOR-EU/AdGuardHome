import React, { useMemo } from 'react';

import { Rewrite, formatShortDateTime } from 'panel/helpers/helpers';
import intl from 'panel/common/intl';
import { LOCAL_STORAGE_KEYS, LocalStorageHelper } from 'panel/helpers/localStorageHelper';
import { Table as ReactTable, TableColumn } from 'panel/common/ui/Table';
import { Icon } from 'panel/common/ui/Icon';
import theme from 'panel/lib/theme';

import cn from 'clsx';
import s from './ListsTable.module.pcss';

const DEFAULT_PAGE_SIZE = 10;

type RewriteToggleData = {
    domain: string;
    answer: string;
    enabled: boolean;
};

type Props = {
    list: Rewrite[];
    processing: boolean;
    processingAdd: boolean;
    processingDelete: boolean;
    processingUpdate: boolean;
    addRewritesList: (...args: unknown[]) => unknown;
    handleDelete: (...args: unknown[]) => unknown;
    toggleRewritesModal: (...args: unknown[]) => unknown;
    toggleRewritesList: (url: string, data: RewriteToggleData) => void;
};

export const ListsTable = ({
    list,
    processing,
    processingAdd,
    processingDelete,
    processingUpdate,
    addRewritesList,
    handleDelete,
    toggleRewritesModal,
}: Props) => {
    const pageSize = useMemo(
        () => LocalStorageHelper.getItem(LOCAL_STORAGE_KEYS.BLOCKLIST_PAGE_SIZE) || DEFAULT_PAGE_SIZE,
        [],
    );

    const columns: TableColumn<Rewrite>[] = useMemo(
        () => [
            {
                key: 'domain',
                header: {
                    text: intl.getMessage('domain'),
                    className: s.headerCell,
                },
                accessor: 'domain',
                sortable: true,
                render: (value: string) => (
                    <div className={s.cell}>
                        <span className={s.cellLabel}>{intl.getMessage('name_label')}</span>

                        <div className={s.cellValue}>
                            <span className={theme.common.textOverflow}>{value}</span>
                        </div>
                    </div>
                ),
            },
            {
                key: 'answer',
                header: {
                    text: intl.getMessage('result'),
                    className: s.headerCell,
                },
                accessor: 'answer',
                sortable: true,
                render: (value: string) => (
                    <div className={s.cell}>
                        <span className={s.cellLabel}>{intl.getMessage('result')}</span>

                        <div className={s.cellValue}>
                            <span className={theme.common.textOverflow}>{value}</span>
                        </div>
                    </div>
                ),
            },
            {
                key: 'actions',
                header: {
                    text: intl.getMessage('actions_label'),
                    className: s.headerCell,
                },
                sortable: false,
                render: (value: any, row: Rewrite) => {
                    const currentRewrite = {
                        answer: row.answer,
                        domain: row.domain,
                    };

                    return (
                        <div className={s.cell}>
                            <span className={s.cellLabel}>{intl.getMessage('actions_label')}</span>

                            <div className={s.cellValue}>
                                <div className={s.cellActions}>
                                    <button
                                        type="button"
                                        onClick={() => toggleRewritesModal(currentRewrite)}
                                        disabled={processingUpdate}
                                        className={s.action}
                                    >
                                        <Icon icon="edit" color="gray" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleDelete(currentRewrite)}
                                        disabled={processingDelete}
                                        className={s.action}
                                    >
                                        <Icon icon="delete" color="red" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                },
            },
        ],
        [processingDelete, processingUpdate],
    );

    const handlePageSizeChange = (newSize: number) => {
        LocalStorageHelper.setItem(LOCAL_STORAGE_KEYS.BLOCKLIST_PAGE_SIZE, newSize);
    };

    const emptyTableContent = () => {
        return (
            <div className={s.emptyTableContent}>
                <Icon icon="not_found_search" color="gray" className={s.emptyTableIcon} />

                <div className={cn(theme.text.t3, s.emptyTableDesc)}>
                    {intl.getMessage('allowlist_empty', {
                        button: (text: string) => (
                            <button className={cn(theme.text.t3, theme.link.link)} type="button" onClick={() => addRewritesList()}>
                                {text}
                            </button>
                        ),
                    })}
                </div>
            </div>
        );
    };

    return (
        <ReactTable<Rewrite>
            data={list || []}
            className={s.table}
            columns={columns}
            emptyTable={emptyTableContent()}
            loading={processing || processingAdd || processingDelete}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
        />
    );
};
