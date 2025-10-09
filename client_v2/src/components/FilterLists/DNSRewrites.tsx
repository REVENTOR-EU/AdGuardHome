import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import cn from 'clsx';

import intl from 'panel/common/intl';
import { MODAL_TYPE } from 'panel/helpers/constants';
import { RootState } from 'panel/initialState';
import theme from 'panel/lib/theme';
import { getFilteringStatus, toggleFilterStatus, refreshFilters } from 'panel/actions/filtering';
import { Icon } from 'panel/common/ui/Icon';
import { openModal } from 'panel/reducers/modals';
import { DeleteBlocklistModal } from 'panel/components/FilterLists/blocks/DeleteBlocklistModal';
import { ConfigureBlocklistModal } from 'panel/components/FilterLists/blocks/ConfigureBlocklistModal';
import { ListsTable, TABLE_IDS } from './blocks/ListsTable/ListsTable';
import { FilterUpdateModal } from './blocks/FilterUpdateModal';

import s from './FilterLists.module.pcss';

export const DNSRewrites = () => {
    const dispatch = useDispatch();
    const { rewrites } = useSelector((state: RootState) => state);
    const [currentFilter, setCurrentFilter] = useState<{ url: string; name: string; enabled?: boolean }>({
        url: '',
        name: '',
    });

    const {  } = rewrites;

    useEffect(() => {
        dispatch(getFilteringStatus());
    }, [dispatch]);

    const toggleRewrite = (url: string, data: { name: string; url: string; enabled: boolean }) => {
        dispatch(toggleFilterStatus(url, data));
    };

    const handleRefresh = () => {
        dispatch(refreshFilters({ whitelist: false }));
    };

    const openFilterUpdateModal = () => {
        dispatch(openModal(MODAL_TYPE.FILTER_UPDATE));
    };

    const openAddBlocklistModal = () => {
        dispatch(openModal(MODAL_TYPE.ADD_BLOCKLIST));
    };

    const openEditBlocklistModal = (url: string, name: string, enabled: boolean) => {
        setCurrentFilter({ url, name, enabled });
        dispatch(openModal(MODAL_TYPE.EDIT_BLOCKLIST));
    };

    const openDeleteBlocklistModal = (url: string, name: string) => {
        setCurrentFilter({ url, name });
        dispatch(openModal(MODAL_TYPE.DELETE_BLOCKLIST));
    };

    return (
        <div className={theme.layout.container}>
            <div className={theme.layout.containerIn}>
                <h1 className={cn(theme.layout.title, theme.title.h4, theme.title.h3_tablet)}>
                    {intl.getMessage('dns_rewrites')}
                </h1>

                <div className={s.desc}>{intl.getMessage('dns_rewrites_desc')}</div>

                <div className={s.group}>
                    <button type="button" className={cn(s.button, s.button_add)} onClick={openAddBlocklistModal}>
                        <Icon icon="plus" color="green" />
                        {intl.getMessage('rewrite_add')}
                    </button>
                </div>

                <div className={cn(s.group, s.stretchSelf)}>
                    <ListsTable
                        tableId={TABLE_IDS.DNSREWRITES_TABLE}
                        filters={filters}
                        processingConfigFilter={processingConfigFilter}
                        toggleRewritesList={toggleRewrite}
                        addFilterList={openAddBlocklistModal}
                        editFilterList={openEditBlocklistModal}
                        deleteFilterList={openDeleteBlocklistModal}
                    />
                </div>

                <ConfigureBlocklistModal modalId={MODAL_TYPE.ADD_BLOCKLIST} />

                <ConfigureBlocklistModal modalId={MODAL_TYPE.EDIT_BLOCKLIST} filterToEdit={currentFilter} />

                <DeleteBlocklistModal filterToDelete={currentFilter} setFilterToDelete={setCurrentFilter} />

                <FilterUpdateModal />
            </div>
        </div>
    );
};
